package com.pkm.integration.jira;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.util.Base64;

/** Versioned authenticated encryption. The key stays outside the database. */
@Component
public class JiraTokenCipher {
    private final byte[] key;
    private final SecureRandom random = new SecureRandom();

    public JiraTokenCipher(@Value("${app.jira.token-encryption-key:}") String encodedKey) {
        key = encodedKey.isBlank() ? null : Base64.getDecoder().decode(encodedKey);
        if (key != null && key.length != 32) {
            throw new IllegalArgumentException("JIRA_TOKEN_ENCRYPTION_KEY must encode exactly 32 random bytes");
        }
    }

    public boolean configured() { return key != null; }

    public String encrypt(String value, long projectId) {
        if (key == null) throw new IllegalStateException("Jira token encryption is not configured");
        try {
            byte[] nonce = new byte[12];
            random.nextBytes(nonce);
            Cipher cipher = cipher(Cipher.ENCRYPT_MODE, nonce, projectId);
            return "v1." + Base64.getEncoder().encodeToString(nonce) + "."
                    + Base64.getEncoder().encodeToString(cipher.doFinal(value.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception e) { throw new IllegalStateException("Could not encrypt Jira credentials", e); }
    }

    public String decrypt(String value, long projectId) {
        try {
            String[] parts = value.split("\\.");
            if (parts.length != 3 || !parts[0].equals("v1")) throw new IllegalArgumentException();
            byte[] nonce = Base64.getDecoder().decode(parts[1]);
            if (nonce.length != 12) throw new IllegalArgumentException();
            return new String(cipher(Cipher.DECRYPT_MODE, nonce, projectId)
                    .doFinal(Base64.getDecoder().decode(parts[2])), StandardCharsets.UTF_8);
        } catch (Exception e) { throw new IllegalStateException("Could not decrypt Jira credentials; check the configured key", e); }
    }

    private Cipher cipher(int mode, byte[] nonce, long projectId) throws Exception {
        Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
        cipher.init(mode, new SecretKeySpec(key, "AES"), new GCMParameterSpec(128, nonce));
        cipher.updateAAD(("prism:jira:" + projectId).getBytes(StandardCharsets.UTF_8));
        return cipher;
    }
}
