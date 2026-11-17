package com.pkm.integration.jira;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.pkm.common.ApiException;
import com.pkm.org.OrgAccess;
import com.pkm.project.ProjectAccess;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Base64;
import java.util.HexFormat;
import java.util.List;

@Service
public class JiraIntegrationService {
    public record Site(String id, String name, String url) {}
    public record JiraProject(String id, String key, String name) {}
    public record Status(boolean configured, boolean authorized, boolean connected, boolean canManage,
                         String siteUrl, String projectKey, String projectName, List<Site> sites) {}
    public record ProjectPage(List<JiraProject> values, boolean isLast, int nextStartAt) {}

    private final JdbcTemplate db;
    private final ProjectAccess access;
    private final OrgAccess orgAccess;
    private final JiraClient jira;
    private final JiraTokenCipher cipher;
    private final ObjectMapper mapper;
    private final TransactionTemplate tx;
    private final SecureRandom random = new SecureRandom();

    public JiraIntegrationService(JdbcTemplate db, ProjectAccess access, OrgAccess orgAccess,
                                  JiraClient jira, JiraTokenCipher cipher, ObjectMapper mapper,
                                  PlatformTransactionManager transactions) {
        this.db = db; this.access = access; this.orgAccess = orgAccess;
        this.jira = jira; this.cipher = cipher; this.mapper = mapper;
        tx = new TransactionTemplate(transactions);
        tx.setTimeout(60);
    }

    void requireManager(long userId, long projectId) {
        access.requireOwner(projectId, userId);
        Long orgId = db.queryForObject("SELECT org_id FROM projects WHERE id=?", Long.class, projectId);
        orgAccess.requireAdmin(orgId, userId);
    }

    private boolean canManage(long userId, long projectId) {
        try { requireManager(userId, projectId); return true; }
        catch (ApiException e) { return false; }
    }

    void requireGrantOwner(long userId, long projectId) {
        var owners = db.queryForList("SELECT connected_by FROM jira_connections WHERE project_id=?", Long.class, projectId);
        if (owners.isEmpty()) throw ApiException.conflict("Connect Jira first");
        if (owners.getFirst() != userId) throw ApiException.forbidden("Only the user who authorized Jira can browse sites or select a Jira project. Disconnect and authorize your own account to change it.");
    }

    public Status status(long userId, long projectId) {
        access.requireMember(projectId, userId);
        boolean manager = canManage(userId, projectId);
        var rows = db.queryForList("SELECT site_url, jira_project_key, jira_project_name, authorized_sites, connected_by "
                + "FROM jira_connections WHERE project_id=?", projectId);
        if (rows.isEmpty()) return new Status(jira.configured() && cipher.configured(), false, false,
                manager, null, null, null, List.of());
        var row = rows.getFirst();
        return new Status(jira.configured() && cipher.configured(), true, row.get("jira_project_key") != null,
                manager, (String) row.get("site_url"), (String) row.get("jira_project_key"),
                (String) row.get("jira_project_name"), manager && ((Number) row.get("connected_by")).longValue() == userId
                        ? readSites((String) row.get("authorized_sites")) : List.of());
    }

    public String begin(long userId, long projectId) {
        requireManager(userId, projectId);
        if (!jira.configured() || !cipher.configured()) throw ApiException.conflict("Jira OAuth configuration is incomplete on the server");
        if (Boolean.TRUE.equals(db.queryForObject("SELECT EXISTS(SELECT 1 FROM jira_connections WHERE project_id=?)", Boolean.class, projectId))) {
            throw ApiException.conflict("Disconnect the current Jira connection before authorizing a new one");
        }
        byte[] bytes = new byte[32]; random.nextBytes(bytes);
        String state = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        tx.executeWithoutResult(s -> {
            db.update("DELETE FROM jira_oauth_states WHERE expires_at < now() OR (project_id=? AND user_id=?)", projectId, userId);
            db.update("INSERT INTO jira_oauth_states(state_hash,user_id,project_id,expires_at) VALUES(?,?,?,?)",
                    hash(state), userId, projectId, Timestamp.from(Instant.now().plusSeconds(600)));
        });
        return UriComponentsBuilder.fromHttpUrl("https://auth.atlassian.com/authorize")
                .queryParam("audience", "api.atlassian.com").queryParam("client_id", jira.clientId())
                .queryParam("scope", "read:jira-work offline_access").queryParam("redirect_uri", jira.redirectUri())
                .queryParam("state", state).queryParam("response_type", "code").queryParam("prompt", "consent")
                .build().encode().toUriString();
    }

    public long complete(long userId, String code, String state) {
        if (state.length() > 200 || code.length() > 4096) throw ApiException.badRequest("Invalid Jira callback");
        // Commit consumption before the token exchange, including when the exchange fails.
        Long projectId = tx.execute(s -> {
            var ids = db.queryForList("DELETE FROM jira_oauth_states WHERE state_hash=? AND user_id=? "
                    + "AND expires_at>now() RETURNING project_id", Long.class, hash(state), userId);
            if (ids.size() != 1) throw ApiException.badRequest("Jira connection request expired or was already used. Start again.");
            return ids.getFirst();
        });
        if (projectId == null) throw ApiException.badRequest("Invalid Jira connection request");
        requireManager(userId, projectId);
        JsonNode tokens = jira.exchange(code);
        String token = required(tokens, "access_token");
        String refresh = required(tokens, "refresh_token");
        JsonNode resources = jira.sites(token);
        if (!resources.isArray()) throw ApiException.conflict("Jira returned invalid authorized sites");
        List<Site> sites = new ArrayList<>();
        for (var site : resources) {
            boolean readAllowed = false;
            for (var scope : site.path("scopes")) if (scope.asText().equals("read:jira-work")) readAllowed = true;
            if (readAllowed) {
                String url = required(site, "url");
                if (!url.matches("https://[a-zA-Z0-9-]+\\.atlassian\\.net/?")) {
                    throw ApiException.conflict("Jira returned an unsupported site URL");
                }
                sites.add(new Site(required(site, "id"), required(site, "name"), url.replaceAll("/$", "")));
            }
        }
        if (sites.isEmpty()) throw ApiException.conflict("No Jira site was authorized with read:jira-work. Check the app scopes and reconnect.");
        int inserted = db.update("INSERT INTO jira_connections(project_id,connected_by,access_token,refresh_token,expires_at,authorized_sites) "
                + "VALUES(?,?,?,?,?,?) ON CONFLICT(project_id) DO NOTHING", projectId, userId,
                cipher.encrypt(token, projectId), cipher.encrypt(refresh, projectId), expires(tokens), json(sites));
        if (inserted != 1) throw ApiException.conflict("This project already has a Jira connection. Reload the Jira tab.");
        return projectId;
    }

    public ProjectPage projects(long userId, long projectId, String cloudId, int startAt) {
        requireManager(userId, projectId);
        requireGrantOwner(userId, projectId);
        authorizedSite(projectId, cloudId);
        if (startAt < 0 || startAt > 100000) throw ApiException.badRequest("Invalid project page");
        JsonNode page = jira.projects(cloudId, startAt, token(projectId));
        if (!page.path("values").isArray() || !page.path("isLast").isBoolean()) throw ApiException.conflict("Jira returned an invalid project page");
        List<JiraProject> values = new ArrayList<>();
        for (var p : page.path("values")) values.add(new JiraProject(required(p, "id"), required(p, "key"), required(p, "name")));
        if (values.isEmpty() && !page.path("isLast").asBoolean()) throw ApiException.conflict("Jira project pagination did not advance");
        return new ProjectPage(values, page.path("isLast").asBoolean(), startAt + values.size());
    }

    public void select(long userId, long projectId, String cloudId, String jiraProjectId) {
        requireManager(userId, projectId);
        requireGrantOwner(userId, projectId);
        Site site = authorizedSite(projectId, cloudId);
        JsonNode p = jira.project(cloudId, jiraProjectId, token(projectId));
        String actualId = required(p, "id");
        if (!actualId.equals(jiraProjectId)) throw ApiException.conflict("Jira returned a different project");
        // Key, name and URL are obtained from Atlassian, never trusted from browser input.
        int updated = db.update("UPDATE jira_connections SET cloud_id=?,site_url=?,jira_project_id=?,jira_project_key=?,jira_project_name=? WHERE project_id=? AND (jira_project_id IS NULL OR jira_project_id=?) AND sync_status<>'RUNNING'",
                cloudId, site.url(), actualId, required(p, "key"), required(p, "name"), projectId, actualId);
        if (updated != 1) throw ApiException.conflict("Jira was disconnected while selecting the project. Connect again.");
    }

    public void disconnect(long userId, long projectId) {
        requireManager(userId, projectId);
        tx.executeWithoutResult(s -> {
            db.update("DELETE FROM knowledge_items WHERE project_id=? AND external_id LIKE 'jira:%'",projectId);
            db.update("DELETE FROM jira_connections WHERE project_id=?", projectId);
            JiraSyncService.queueReports(db,projectId);
            db.update("DELETE FROM jira_oauth_states WHERE project_id=?", projectId);
        });
    }

    private Site authorizedSite(long projectId, String cloudId) {
        var rows = db.queryForList("SELECT authorized_sites FROM jira_connections WHERE project_id=?", String.class, projectId);
        if (rows.isEmpty()) throw ApiException.conflict("Connect Jira first");
        return readSites(rows.getFirst()).stream().filter(s -> s.id().equals(cloudId)).findFirst()
                .orElseThrow(() -> ApiException.forbidden("This Jira site was not authorized for this connection"));
    }

    String token(long projectId) {
        // Separate committed transaction: preserve a newly rotated refresh token even if the later API call fails.
        return tx.execute(s -> {
            var rows = db.queryForList("SELECT access_token,refresh_token,expires_at FROM jira_connections WHERE project_id=? FOR UPDATE", projectId);
            if (rows.isEmpty()) throw ApiException.conflict("Connect Jira first");
            var row = rows.getFirst();
            if (((Timestamp) row.get("expires_at")).toInstant().isAfter(Instant.now().plusSeconds(60))) {
                return cipher.decrypt((String) row.get("access_token"), projectId);
            }
            JsonNode fresh = jira.refresh(cipher.decrypt((String) row.get("refresh_token"), projectId));
            String accessToken = required(fresh, "access_token");
            String refreshToken = required(fresh, "refresh_token");
            db.update("UPDATE jira_connections SET access_token=?,refresh_token=?,expires_at=? WHERE project_id=?",
                    cipher.encrypt(accessToken, projectId), cipher.encrypt(refreshToken, projectId), expires(fresh), projectId);
            return accessToken;
        });
    }

    private Timestamp expires(JsonNode tokens) {
        long seconds = tokens.path("expires_in").asLong(0);
        if (seconds <= 60 || seconds > 86400) throw ApiException.conflict("Jira returned an invalid token lifetime");
        return Timestamp.from(Instant.now().plusSeconds(seconds));
    }

    private List<Site> readSites(String value) {
        try { return mapper.readValue(value, mapper.getTypeFactory().constructCollectionType(List.class, Site.class)); }
        catch (Exception e) { throw new IllegalStateException("Stored Jira site metadata is invalid", e); }
    }

    private String json(Object value) {
        try { return mapper.writeValueAsString(value); }
        catch (Exception e) { throw new IllegalStateException("Could not store Jira site metadata", e); }
    }

    private String required(JsonNode value, String field) {
        if (!value.path(field).isTextual() || value.path(field).asText().isBlank()) {
            throw ApiException.conflict("Jira response is missing " + field + ". Check authorization and reconnect.");
        }
        return value.path(field).asText();
    }

    static String hash(String state) {
        try { return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(state.getBytes(StandardCharsets.UTF_8))); }
        catch (Exception e) { throw new IllegalStateException(e); }
    }
}
