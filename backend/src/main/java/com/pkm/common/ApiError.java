package com.pkm.common;

import java.time.Instant;
import java.util.Map;

/** Shape of every error response: the frontend relies on {@code message} (and {@code fieldErrors} for forms). */
public record ApiError(
        Instant timestamp,
        int status,
        String error,
        String message,
        String path,
        Map<String, String> fieldErrors
) {
}
