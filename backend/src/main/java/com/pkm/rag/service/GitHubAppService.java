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
        // The .env stores the entire PEM file as base64. Decode it first to get the PEM text.
        String pemText = new String(Base64.getDecoder().decode(privateKeyBase64));
        
        // Strip PEM headers and whitespace to get raw key bytes
        String cleanedKey = pemText
                .replace("-----BEGIN RSA PRIVATE KEY-----", "")
                .replace("-----END RSA PRIVATE KEY-----", "")
                .replace("-----BEGIN PRIVATE KEY-----", "")
                .replace("-----END PRIVATE KEY-----", "")
                .replaceAll("\\s+", "");

        byte[] keyBytes = Base64.getDecoder().decode(cleanedKey);
        
        // GitHub generates PKCS#1 keys (BEGIN RSA PRIVATE KEY), not PKCS#8
        // We need to convert PKCS#1 to PKCS#8 for Java's KeyFactory
        if (pemText.contains("BEGIN RSA PRIVATE KEY")) {
            // PKCS#1 → wrap in PKCS#8 ASN.1 structure
            byte[] pkcs8Bytes = convertPkcs1ToPkcs8(keyBytes);
            PKCS8EncodedKeySpec spec = new PKCS8EncodedKeySpec(pkcs8Bytes);
            KeyFactory kf = KeyFactory.getInstance("RSA");
            return kf.generatePrivate(spec);
        } else {
            // Already PKCS#8
            PKCS8EncodedKeySpec spec = new PKCS8EncodedKeySpec(keyBytes);
            KeyFactory kf = KeyFactory.getInstance("RSA");
            return kf.generatePrivate(spec);
        }
    }

    /**
     * Wraps a PKCS#1 RSA private key in a PKCS#8 envelope.
     * PKCS#8 = SEQUENCE { version, AlgorithmIdentifier { OID rsaEncryption, NULL }, OCTET STRING { pkcs1key } }
     */
    private byte[] convertPkcs1ToPkcs8(byte[] pkcs1Bytes) throws Exception {
        // RSA OID: 1.2.840.113549.1.1.1
        byte[] rsaOid = {0x06, 0x09, 0x2a, (byte) 0x86, 0x48, (byte) 0x86, (byte) 0xf7, 0x0d, 0x01, 0x01, 0x01};
        byte[] nullParam = {0x05, 0x00};
        
        // AlgorithmIdentifier SEQUENCE
        byte[] algIdContent = new byte[rsaOid.length + nullParam.length];
        System.arraycopy(rsaOid, 0, algIdContent, 0, rsaOid.length);
        System.arraycopy(nullParam, 0, algIdContent, rsaOid.length, nullParam.length);
        byte[] algId = wrapInSequence(algIdContent);
        
        // OCTET STRING wrapping the PKCS#1 key
        byte[] octetString = wrapInTag((byte) 0x04, pkcs1Bytes);
        
        // Version INTEGER 0
        byte[] version = {0x02, 0x01, 0x00};
        
        // Final SEQUENCE
        byte[] pkcs8Content = new byte[version.length + algId.length + octetString.length];
        int offset = 0;
        System.arraycopy(version, 0, pkcs8Content, offset, version.length); offset += version.length;
        System.arraycopy(algId, 0, pkcs8Content, offset, algId.length); offset += algId.length;
        System.arraycopy(octetString, 0, pkcs8Content, offset, octetString.length);
        
        return wrapInSequence(pkcs8Content);
    }
    
    private byte[] wrapInSequence(byte[] content) {
        return wrapInTag((byte) 0x30, content);
    }
    
    private byte[] wrapInTag(byte tag, byte[] content) {
        byte[] lengthBytes = encodeLength(content.length);
        byte[] result = new byte[1 + lengthBytes.length + content.length];
        result[0] = tag;
        System.arraycopy(lengthBytes, 0, result, 1, lengthBytes.length);
        System.arraycopy(content, 0, result, 1 + lengthBytes.length, content.length);
        return result;
    }
    
    private byte[] encodeLength(int length) {
        if (length < 128) {
            return new byte[]{(byte) length};
        } else if (length < 256) {
            return new byte[]{(byte) 0x81, (byte) length};
        } else if (length < 65536) {
            return new byte[]{(byte) 0x82, (byte) (length >> 8), (byte) (length & 0xFF)};
        } else {
            return new byte[]{(byte) 0x83, (byte) (length >> 16), (byte) ((length >> 8) & 0xFF), (byte) (length & 0xFF)};
        }
    }
}
