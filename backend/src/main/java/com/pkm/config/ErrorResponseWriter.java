package com.pkm.config;

import jakarta.servlet.http.HttpServletResponse;

import java.io.IOException;

/** Writes the standard JSON error body from servlet filters (where controller advice does not apply). */
final class ErrorResponseWriter {

    private ErrorResponseWriter() {
    }

    /** Messages passed here are fixed constants, so no JSON escaping is required. */
    static void write(HttpServletResponse response, int status, String error, String message) throws IOException {
        response.setStatus(status);
        response.setContentType("application/json");
        response.setCharacterEncoding("UTF-8");
        response.getWriter().write("{\"status\":" + status + ",\"error\":\"" + error
                + "\",\"message\":\"" + message + "\"}");
    }
}
