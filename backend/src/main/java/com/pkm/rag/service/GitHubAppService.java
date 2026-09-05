package com.pkm.rag.service;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.security.KeyFactory;
import java.security.PrivateKey;
import java.security.spec.PKCS8EncodedKeySpec;
import java.time.Instant;
import java.util.Base64;
import java.util.Date;
import java.util.Map;

@Service
public class GitHubAppService {

    @Value("${app.github.app-id:}")
    private String appId;

    @Value("${app.github.private-key-base64:}")
    private String privateKeyBase64;

    private final RestTemplate restTemplate;

    public GitHubAppService() {
        this.restTemplate = new RestTemplate();
    }

    public String getInstallationAccessToken(String installationId) {
        if (installationId == null || installationId.isBlank()) {
            return null;
        }

        try {
            String jwt = generateAppJwt();
            
            HttpHeaders headers = new HttpHeaders();
            headers.setBearerAuth(jwt);
            headers.set("Accept", "application/vnd.github+json");
            headers.set("X-GitHub-Api-Version", "2022-11-28");
            
            HttpEntity<String> entity = new HttpEntity<>(headers);
            
            String url = "https://api.github.com/app/installations/" + installationId + "/access_tokens";
            
            ResponseEntity<Map> response = restTemplate.exchange(url, HttpMethod.POST, entity, Map.class);
            
            if (response.getBody() != null && response.getBody().containsKey("token")) {
                return (String) response.getBody().get("token");
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        return null;
    }

    public java.util.List<Map<String, Object>> getRepositoriesForInstallation(String installationId) {
        String token = getInstallationAccessToken(installationId);
        if (token == null) return java.util.Collections.emptyList();

        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setBearerAuth(token);
            headers.set("Accept", "application/vnd.github+json");
            headers.set("X-GitHub-Api-Version", "2022-11-28");
            
            HttpEntity<String> entity = new HttpEntity<>(headers);
            String url = "https://api.github.com/installation/repositories";
            
            ResponseEntity<Map> response = restTemplate.exchange(url, HttpMethod.GET, entity, Map.class);
            if (response.getBody() != null && response.getBody().containsKey("repositories")) {
                return (java.util.List<Map<String, Object>>) response.getBody().get("repositories");
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        return java.util.Collections.emptyList();
    }

    private String generateAppJwt() throws Exception {
        long nowMillis = System.currentTimeMillis();
        long expMillis = nowMillis + (10 * 60 * 1000); // 10 minutes maximum for GitHub

        PrivateKey privateKey = getPrivateKey();

        return Jwts.builder()
                .setIssuer(appId)
                .setIssuedAt(new Date(nowMillis))
                .setExpiration(new Date(expMillis))
                .signWith(privateKey, SignatureAlgorithm.RS256)
                .compact();
    }

    private PrivateKey getPrivateKey() throws Exception {
        // Strip standard PEM headers and newlines if they somehow got included
        String cleanedKey = privateKeyBase64
                .replace("-----BEGIN PRIVATE KEY-----", "")
                .replace("-----END PRIVATE KEY-----", "")
                .replace("-----BEGIN RSA PRIVATE KEY-----", "")
                .replace("-----END RSA PRIVATE KEY-----", "")
                .replaceAll("\\s+", "");

        byte[] keyBytes = Base64.getDecoder().decode(cleanedKey);
        PKCS8EncodedKeySpec spec = new PKCS8EncodedKeySpec(keyBytes);
        KeyFactory kf = KeyFactory.getInstance("RSA");
        return kf.generatePrivate(spec);
    }
}
