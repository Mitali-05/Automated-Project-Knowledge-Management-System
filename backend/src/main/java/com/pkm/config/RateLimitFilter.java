package com.pkm.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Slows down password guessing and invite-code guessing: at most {@code maxAttempts} POSTs per client address
 * and endpoint within a sliding one-minute window, then HTTP 429.
 *
 * The counters live in memory, which is right for a single backend instance. With several instances behind a
 * load balancer, move the counters to a shared store (e.g. Redis) or enforce this at the gateway. Behind a proxy,
 * make sure the servlet container reports the real client address (server.forward-headers-strategy) - otherwise
 * every user shares the proxy's address.
 */
public class RateLimitFilter extends OncePerRequestFilter {

    private static final long WINDOW_MS = 60_000L;
    private static final Set<String> LIMITED_PATHS = Set.of("/api/auth/login", "/api/auth/signup", "/api/orgs/join");

    private final int maxAttempts;
    private final Map<String, Deque<Long>> attempts = new ConcurrentHashMap<>();
    private volatile long lastSweep = System.currentTimeMillis();

    public RateLimitFilter(int maxAttempts) {
        this.maxAttempts = maxAttempts;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return !"POST".equalsIgnoreCase(request.getMethod()) || !LIMITED_PATHS.contains(request.getRequestURI());
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        long now = System.currentTimeMillis();
        sweep(now);
        Deque<Long> window = attempts.computeIfAbsent(request.getRemoteAddr() + "|" + request.getRequestURI(),
                k -> new ArrayDeque<>());
        long retryAfterSeconds = 0;
        synchronized (window) {
            while (!window.isEmpty() && now - window.peekFirst() > WINDOW_MS) {
                window.pollFirst();
            }
            if (window.size() >= maxAttempts) {
                retryAfterSeconds = Math.max(1, (WINDOW_MS - (now - window.peekFirst()) + 999) / 1000);
            } else {
                window.addLast(now);
            }
        }
        if (retryAfterSeconds > 0) {
            response.setHeader("Retry-After", String.valueOf(retryAfterSeconds));
            ErrorResponseWriter.write(response, 429, "Too Many Requests",
                    "Too many attempts. Please wait a minute and try again.");
            return;
        }
        chain.doFilter(request, response);
    }

    /** Drops idle entries now and then so the map cannot grow without bound. */
    private void sweep(long now) {
        if (now - lastSweep < WINDOW_MS) {
            return;
        }
        lastSweep = now;
        attempts.entrySet().removeIf(e -> {
            synchronized (e.getValue()) {
                Long newest = e.getValue().peekLast();
                return newest == null || now - newest > WINDOW_MS;
            }
        });
    }
}
