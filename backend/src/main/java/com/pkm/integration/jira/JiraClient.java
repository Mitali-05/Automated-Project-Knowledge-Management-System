package com.pkm.integration.jira;

import com.fasterxml.jackson.databind.JsonNode;
import com.pkm.common.ApiException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;

import java.net.http.HttpClient;
import java.time.Duration;
import java.util.Map;

@Component
public class JiraClient {
    private final RestClient http;
    private final String clientId;
    private final String clientSecret;
    private final String redirectUri;

    @org.springframework.beans.factory.annotation.Autowired
    public JiraClient(@Value("${app.jira.client-id:}") String clientId,
                      @Value("${app.jira.client-secret:}") String clientSecret,
                      @Value("${app.jira.redirect-uri:}") String redirectUri) {
        this(clientId, clientSecret, redirectUri, builder());
    }

    JiraClient(String clientId, String clientSecret, String redirectUri, RestClient.Builder builder) {
        this.clientId = clientId;
        this.clientSecret = clientSecret;
        this.redirectUri = redirectUri;
        this.http = builder.build();
    }

    private static RestClient.Builder builder() {
        var factory = new JdkClientHttpRequestFactory(HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(10)).followRedirects(HttpClient.Redirect.NEVER).build());
        factory.setReadTimeout(Duration.ofSeconds(20));
        return RestClient.builder().requestFactory(factory);
    }

    public boolean configured() { return !clientId.isBlank() && !clientSecret.isBlank() && !redirectUri.isBlank(); }
    public String clientId() { return clientId; }
    public String redirectUri() { return redirectUri; }

    public JsonNode exchange(String code) {
        return token(Map.of("grant_type", "authorization_code", "client_id", clientId,
                "client_secret", clientSecret, "code", code, "redirect_uri", redirectUri));
    }

    public JsonNode refresh(String refreshToken) {
        return token(Map.of("grant_type", "refresh_token", "client_id", clientId,
                "client_secret", clientSecret, "refresh_token", refreshToken));
    }

    private JsonNode token(Map<String, String> body) {
        try {
            return required(http.post().uri("https://auth.atlassian.com/oauth/token")
                    .contentType(org.springframework.http.MediaType.APPLICATION_JSON)
                    .body(body).retrieve().body(JsonNode.class));
        } catch (RestClientException e) { throw upstream(e); }
    }

    public JsonNode sites(String token) {
        return get("https://api.atlassian.com/oauth/token/accessible-resources", token);
    }

    public JsonNode fields(String cloudId, String token) { return get(root(cloudId) + "/field", token); }

    public JsonNode issues(String cloudId, String projectId, String pageToken, java.util.List<String> fields, String token) {
        if (!projectId.matches("[0-9]{1,30}")) throw ApiException.badRequest("Invalid Jira project id");
        var body = new java.util.HashMap<String,Object>();
        body.put("jql", "project = " + projectId + " ORDER BY id ASC");
        body.put("maxResults", 100); body.put("fields", fields);
        if (pageToken != null) body.put("nextPageToken", pageToken);
        try { return required(http.post().uri(root(cloudId) + "/search/jql")
            .headers(h -> h.setBearerAuth(token)).contentType(org.springframework.http.MediaType.APPLICATION_JSON)
            .body(body).retrieve().body(JsonNode.class)); }
        catch (RestClientException e) { throw upstream(e); }
    }

    public JsonNode comments(String cloudId, String issueId, int startAt, String token) {
        if (!issueId.matches("[0-9]{1,30}")) throw ApiException.badRequest("Invalid Jira issue id");
        return get(root(cloudId) + "/issue/" + issueId + "/comment?maxResults=100&startAt=" + startAt, token);
    }

    public JsonNode project(String cloudId, String projectId, String token) {
        if (!projectId.matches("[0-9]{1,30}")) throw ApiException.badRequest("Invalid Jira project id");
        return get(root(cloudId) + "/project/" + projectId, token);
    }

    public JsonNode projects(String cloudId, int startAt, String token) {
        return get(root(cloudId) + "/project/search?maxResults=50&startAt=" + startAt, token);
    }

    private String root(String cloudId) {
        if (!cloudId.matches("[a-zA-Z0-9-]{1,100}")) throw ApiException.badRequest("Invalid Jira site id");
        return "https://api.atlassian.com/ex/jira/" + cloudId + "/rest/api/3";
    }

    private JsonNode get(String url, String token) {
        try { return required(http.get().uri(url).headers(h -> h.setBearerAuth(token))
                .retrieve().body(JsonNode.class)); }
        catch (RestClientException e) { throw upstream(e); }
    }

    private JsonNode required(JsonNode value) {
        if (value == null || value.isNull()) throw new ApiException(HttpStatus.BAD_GATEWAY, "Jira returned an empty response");
        return value;
    }

    private ApiException upstream(RestClientException e) {
        // Never forward response bodies: OAuth responses can contain credentials.
        if (e instanceof RestClientResponseException r) {
            int status = r.getStatusCode().value();
            if (status == 400 || status == 401) return ApiException.conflict("Jira authorization expired or was rejected. Connect Jira again.");
            if (status == 403) return ApiException.forbidden("Jira denied access. Check the consent scopes and your Jira project permissions.");
            if (status == 429) return new ApiException(HttpStatus.TOO_MANY_REQUESTS, "Jira rate limit reached. Try again later.");
            if (status == 404) return ApiException.notFound("Jira site or project is no longer accessible");
        }
        return new ApiException(HttpStatus.BAD_GATEWAY, "Jira request failed. Check connectivity and try again.");
    }
}
