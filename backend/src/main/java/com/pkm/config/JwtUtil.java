package com.pkm.config;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import java.util.Optional;

/** Creates and verifies the signed tokens used by the API (access tokens and short-lived GitHub install state). */
@Component
public class JwtUtil {

    private static final String TYPE_ACCESS = "access";
    private static final String TYPE_GITHUB_STATE = "github-state";
    private static final long STATE_TTL_MS = 10 * 60 * 1000L;

    private final SecretKey key;
    private final long expirationMs;

    public JwtUtil(@Value("${app.jwt.secret:}") String secret,
                   @Value("${app.jwt.expiration-ms}") long expirationMs) {
        if (secret == null || secret.isBlank() || secret.startsWith("change-me")) {
            throw new IllegalStateException(
                    "JWT_SECRET is not configured. Set it to a random value of at least 32 characters "
                            + "(e.g. `openssl rand -base64 48`) - see .env.example.");
        }
        byte[] bytes = secret.getBytes(StandardCharsets.UTF_8);
        if (bytes.length < 32) {
            throw new IllegalStateException("JWT_SECRET must be at least 32 characters long.");
        }
        this.key = Keys.hmacShaKeyFor(bytes);
        this.expirationMs = expirationMs;
    }

    public String generateToken(Long userId, String email) {
        Date now = new Date();
        return Jwts.builder()
                .subject(String.valueOf(userId))
                .claim("email", email)
                .claim("typ", TYPE_ACCESS)
                .issuedAt(now)
                .expiration(new Date(now.getTime() + expirationMs))
                .signWith(key)
                .compact();
    }

    /** When a token issued right now will expire. */
    public Instant expiryFromNow() {
        return Instant.now().plusMillis(expirationMs);
    }

    /** Returns the user id if (and only if) the token is a valid, unexpired access token. */
    public Optional<Long> parseAccessToken(String token) {
        try {
            Claims claims = parse(token);
            if (!TYPE_ACCESS.equals(claims.get("typ", String.class))) {
                return Optional.empty();
            }
            return Optional.of(Long.parseLong(claims.getSubject()));
        } catch (JwtException | IllegalArgumentException e) {
            return Optional.empty();
        }
    }

    /** Opaque state value that binds a GitHub App installation round-trip to the user and organization it started for. */
    public String generateGithubState(Long userId, Long orgId) {
        Date now = new Date();
        return Jwts.builder()
                .subject(String.valueOf(userId))
                .claim("typ", TYPE_GITHUB_STATE)
                .claim("org", orgId)
                .issuedAt(now)
                .expiration(new Date(now.getTime() + STATE_TTL_MS))
                .signWith(key)
                .compact();
    }

    /** The organization id carried by a valid install state that was issued to this user, otherwise empty. */
    public Optional<Long> parseGithubState(String state, Long userId) {
        try {
            Claims claims = parse(state);
            if (!TYPE_GITHUB_STATE.equals(claims.get("typ", String.class))
                    || !String.valueOf(userId).equals(claims.getSubject())) {
                return Optional.empty();
            }
            Number org = claims.get("org", Number.class);
            return org == null ? Optional.empty() : Optional.of(org.longValue());
        } catch (JwtException | IllegalArgumentException e) {
            return Optional.empty();
        }
    }

    private Claims parse(String token) {
        return Jwts.parser().verifyWith(key).build().parseSignedClaims(token).getPayload();
    }
}
