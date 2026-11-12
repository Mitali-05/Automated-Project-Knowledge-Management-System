package com.pkm.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.List;

/**
 * Protects /api/ingest/** for the extraction service. The shared secret is sent in the
 * X-Service-Key header. If no key is configured the endpoints are disabled entirely.
 */
public class ServiceKeyFilter extends OncePerRequestFilter {

    private final byte[] expectedKey;

    public ServiceKeyFilter(String serviceKey) {
        this.expectedKey = serviceKey == null ? new byte[0] : serviceKey.trim().getBytes(StandardCharsets.UTF_8);
    }

    @Override
    protected boolean shouldNotFilter(@NonNull HttpServletRequest request) {
        return !request.getRequestURI().startsWith("/api/ingest/");
    }

    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest request,
                                    @NonNull HttpServletResponse response,
                                    @NonNull FilterChain filterChain) throws ServletException, IOException {
        if (expectedKey.length == 0) {
            ErrorResponseWriter.write(response, 503, "Service Unavailable",
                    "Ingestion is disabled: INGEST_SERVICE_KEY is not configured");
            return;
        }
        String provided = request.getHeader("X-Service-Key");
        boolean valid = provided != null
                && MessageDigest.isEqual(provided.trim().getBytes(StandardCharsets.UTF_8), expectedKey);
        if (!valid) {
            ErrorResponseWriter.write(response, 401, "Unauthorized", "Invalid or missing service key");
            return;
        }
        var authentication = new UsernamePasswordAuthenticationToken(
                "extraction-service", null, List.of(new SimpleGrantedAuthority("ROLE_SERVICE")));
        SecurityContextHolder.getContext().setAuthentication(authentication);
        filterChain.doFilter(request, response);
    }
}
