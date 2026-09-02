package com.pkm.project.dto;

import java.time.Instant;

public record ProjectResponse(
        Long id,
        String name,
        String description,
        String role,       // "owner" or "contributor" — for the current user
        Instant createdAt
) {}
