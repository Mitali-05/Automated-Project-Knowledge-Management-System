package com.pkm.integration.github;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.pkm.common.ApiException;
import com.pkm.config.JwtUtil;
import com.pkm.org.OrgAccess;
import com.pkm.org.OrganizationRepository;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.*;

@Service
public class GithubConnectionService {
    private final JdbcTemplate db;
    private final OrgAccess access;
    private final OrganizationRepository organizations;
    private final JwtUtil jwt;
    private final GitHubAppService github;
    private final ObjectMapper mapper;
    public GithubConnectionService(JdbcTemplate db,OrgAccess access,OrganizationRepository organizations,JwtUtil jwt,GitHubAppService github,ObjectMapper mapper) {
        this.db=db;this.access=access;this.organizations=organizations;this.jwt=jwt;this.github=github;this.mapper=mapper;
    }
    public record Options(String connectionId,List<GitHubAppService.UserInstallation> installations,String installUrl) {}
    public Options authorize(long user,String code,String state) {
        Long org=jwt.parseGithubState(state,user).orElseThrow(()->ApiException.badRequest("GitHub connection expired. Start again from PRISM."));
        access.requireAdmin(org,user);
        var options=github.authorizedInstallations(code);
        UUID id=UUID.randomUUID();
        try {
            db.update("DELETE FROM github_connection_selections WHERE expires_at<now() OR (user_id=? AND org_id=?)",user,org);
            db.update("INSERT INTO github_connection_selections(id,user_id,org_id,installations) VALUES(?,?,?,?)",id,user,org,mapper.writeValueAsString(options));
        } catch(com.fasterxml.jackson.core.JsonProcessingException e){throw new IllegalStateException(e);}
        return new Options(id.toString(),options,github.installUrl(jwt.generateGithubState(user,org)));
    }
    @Transactional
    public long select(long user,String selection,String installation) {
        UUID id;try{id=UUID.fromString(selection);}catch(Exception e){throw ApiException.badRequest("Invalid connection selection");}
        var rows=db.queryForList("DELETE FROM github_connection_selections WHERE id=? AND user_id=? AND expires_at>now() RETURNING org_id,installations",id,user);
        if(rows.isEmpty()) throw ApiException.badRequest("GitHub selection expired or was already used. Connect again.");
        var row=rows.getFirst();long org=((Number)row.get("org_id")).longValue();
        var target=access.requireAdmin(org,user).getOrganization();
        boolean verified;
        try { verified=mapper.readTree((String)row.get("installations")).findValuesAsText("id").contains(installation); }
        catch(Exception e){throw new IllegalStateException("Invalid stored GitHub selection",e);}
        if(!verified) throw ApiException.forbidden("This installation was not authorized by your GitHub account");
        organizations.findByGithubInstallationId(installation).filter(o->!o.getId().equals(org))
            .ifPresent(other -> {
                try {
                    access.requireAdmin(other.getId(), user);
                    other.setGithubInstallationId(null);
                    other.setGithubInstallationVerified(false);
                    organizations.saveAndFlush(other);
                } catch (ApiException e) {
                    throw ApiException.conflict("This installation is already connected to another PRISM workspace");
                }
            });
        github.installationToken(installation); // Fail before binding if the app credentials cannot use this installation.
        target.setGithubInstallationId(installation);target.setGithubInstallationVerified(true);organizations.save(target);
        return org;
    }
}
