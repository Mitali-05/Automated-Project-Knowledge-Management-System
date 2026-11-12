package com.pkm.integration.github;

import com.fasterxml.jackson.databind.JsonNode;
import com.pkm.common.ApiException;
import io.jsonwebtoken.Jwts;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.nio.charset.StandardCharsets;
import java.security.KeyFactory;
import java.security.PrivateKey;
import java.security.spec.PKCS8EncodedKeySpec;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Base64;
import java.util.Date;
import java.util.List;
import java.util.Map;

/** Talks to the GitHub REST API as the PRISM GitHub App. Secrets are never logged or returned to callers. */
@Service
public class GitHubAppService {

    private static final Logger log = LoggerFactory.getLogger(GitHubAppService.class);
    private static final String API = "https://api.github.com";

    public record InstallationRepo(long id, String fullName, String url, boolean isPrivate, String description) {
    }

    @Value("${app.github.app-id:}")
    private String appId;
    @Value("${app.github.app-slug:}")
    private String appSlug;
    @Value("${app.github.private-key-base64:}")
    private String privateKeyBase64;
    @Value("${app.github.client-id:}")
    private String clientId;
    @Value("${app.github.client-secret:}")
    private String clientSecret;

    private final RestClient github = RestClient.builder()
            .baseUrl(API)
            .defaultHeader("Accept", "application/vnd.github+json")
            .defaultHeader("X-GitHub-Api-Version", "2022-11-28")
            .build();

    public boolean isConfigured() {
        return notBlank(appId) && notBlank(appSlug) && notBlank(privateKeyBase64);
    }

    public boolean canVerifyOwnership() {
        return notBlank(clientId) && notBlank(clientSecret);
    }

    public String installUrl(String state) {
        return "https://github.com/apps/" + appSlug + "/installations/new?state=" + state;
    }

    /** Short-lived (about 1 hour) token that can read only the repositories the customer granted to the app. */
    public String installationToken(String installationId) {
        requireConfigured();
        try {
            JsonNode body = github.post()
                    .uri("/app/installations/{id}/access_tokens", installationId)
                    .headers(h -> h.setBearerAuth(appJwt()))
                    .retrieve().body(JsonNode.class);
            if (body == null || !body.hasNonNull("token")) {
                throw upstream("GitHub did not return an access token");
            }
            return body.get("token").asText();
        } catch (RestClientException e) {
            log.warn("GitHub installation token request failed: {}", e.getMessage());
            throw upstream("Could not authenticate with GitHub. Reinstall the PRISM GitHub App and try again.");
        }
    }

    public List<InstallationRepo> repositories(String installationId) {
        String token = installationToken(installationId);
        List<InstallationRepo> result = new ArrayList<>();
        try {
            for (int page = 1; page <= 5; page++) {          // up to 500 repositories
                JsonNode body = github.get()
                        .uri("/installation/repositories?per_page=100&page={p}", page)
                        .headers(h -> h.setBearerAuth(token))
                        .retrieve().body(JsonNode.class);
                if (body == null || !body.has("repositories")) {
                    break;
                }
                for (JsonNode r : body.get("repositories")) {
                    result.add(new InstallationRepo(r.path("id").asLong(), r.path("full_name").asText(),
                            r.path("html_url").asText(), r.path("private").asBoolean(),
                            r.path("description").isNull() ? null : r.path("description").asText(null)));
                }
                if (body.get("repositories").size() < 100) {
                    break;
                }
            }
        } catch (RestClientException e) {
            log.warn("GitHub repository listing failed: {}", e.getMessage());
            throw upstream("Could not load repositories from GitHub.");
        }
        return result;
    }

    /**
     * Confirms that the person completing the install really has access to that installation, using the OAuth
     * code GitHub appends to the callback when "Request user authorization during installation" is enabled.
     */
    public boolean userOwnsInstallation(String oauthCode, String installationId) {
        if (!canVerifyOwnership() || oauthCode == null || oauthCode.isBlank()) {
            return false;
        }
        try {
            JsonNode tokenResponse = RestClient.create().post()
                    .uri("https://github.com/login/oauth/access_token")
                    .accept(MediaType.APPLICATION_JSON)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(Map.of("client_id", clientId, "client_secret", clientSecret, "code", oauthCode))
                    .retrieve().body(JsonNode.class);
            if (tokenResponse == null || !tokenResponse.hasNonNull("access_token")) {
                return false;
            }
            String userToken = tokenResponse.get("access_token").asText();
            JsonNode installations = github.get().uri("/user/installations?per_page=100")
                    .headers(h -> h.setBearerAuth(userToken))
                    .retrieve().body(JsonNode.class);
            if (installations == null) {
                return false;
            }
            for (JsonNode i : installations.path("installations")) {
                if (installationId.equals(i.path("id").asText())) {
                    return true;
                }
            }
        } catch (RestClientException e) {
            log.warn("GitHub installation ownership check failed: {}", e.getMessage());
        }
        return false;
    }

    // ---------------------------------------------------------------- internals

    private String appJwt() {
        Instant now = Instant.now();
        try {
            return Jwts.builder()
                    .issuer(appId)
                    .issuedAt(Date.from(now.minusSeconds(30)))      // allow for clock drift
                    .expiration(Date.from(now.plusSeconds(9 * 60)))  // GitHub maximum is 10 minutes
                    .signWith(privateKey(), Jwts.SIG.RS256)
                    .compact();
        } catch (Exception e) {
            log.error("Could not sign GitHub App JWT - check GITHUB_APP_PRIVATE_KEY_BASE64", e);
            throw upstream("GitHub App is misconfigured on the server.");
        }
    }

    private PrivateKey privateKey() throws Exception {
        String pem = new String(Base64.getDecoder().decode(privateKeyBase64.trim()), StandardCharsets.UTF_8);
        boolean pkcs1 = pem.contains("BEGIN RSA PRIVATE KEY");
        String body = pem.replaceAll("-----(BEGIN|END)[A-Z ]+-----", "").replaceAll("\\s+", "");
        byte[] der = Base64.getDecoder().decode(body);
        if (pkcs1) {
            der = wrapPkcs1(der);    // GitHub issues PKCS#1 keys; the JDK only reads PKCS#8
        }
        return KeyFactory.getInstance("RSA").generatePrivate(new PKCS8EncodedKeySpec(der));
    }

    /** PKCS#8 = SEQUENCE { INTEGER 0, SEQUENCE { OID rsaEncryption, NULL }, OCTET STRING { pkcs1 key } }. */
    private static byte[] wrapPkcs1(byte[] pkcs1) {
        byte[] algorithm = {0x30, 0x0d, 0x06, 0x09, 0x2a, (byte) 0x86, 0x48, (byte) 0x86, (byte) 0xf7, 0x0d,
                0x01, 0x01, 0x01, 0x05, 0x00};
        byte[] version = {0x02, 0x01, 0x00};
        byte[] octet = tlv((byte) 0x04, pkcs1);
        byte[] content = new byte[version.length + algorithm.length + octet.length];
        System.arraycopy(version, 0, content, 0, version.length);
        System.arraycopy(algorithm, 0, content, version.length, algorithm.length);
        System.arraycopy(octet, 0, content, version.length + algorithm.length, octet.length);
        return tlv((byte) 0x30, content);
    }

    private static byte[] tlv(byte tag, byte[] value) {
        byte[] length;
        int n = value.length;
        if (n < 128) {
            length = new byte[]{(byte) n};
        } else if (n < 256) {
            length = new byte[]{(byte) 0x81, (byte) n};
        } else if (n < 65536) {
            length = new byte[]{(byte) 0x82, (byte) (n >> 8), (byte) n};
        } else {
            length = new byte[]{(byte) 0x83, (byte) (n >> 16), (byte) (n >> 8), (byte) n};
        }
        byte[] out = new byte[1 + length.length + n];
        out[0] = tag;
        System.arraycopy(length, 0, out, 1, length.length);
        System.arraycopy(value, 0, out, 1 + length.length, n);
        return out;
    }

    private void requireConfigured() {
        if (!isConfigured()) {
            throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE,
                    "The GitHub App is not configured on the server. Public repositories can still be linked by URL.");
        }
    }

    private static ApiException upstream(String message) {
        return new ApiException(HttpStatus.BAD_GATEWAY, message);
    }

    private static boolean notBlank(String s) {
        return s != null && !s.isBlank();
    }
}
