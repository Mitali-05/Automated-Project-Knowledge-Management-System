package com.pkm.auth.dto;

public record AuthResponse(
        String token,
        Long userId,
        String name,
        String email,
        Long organizationId,
        String organizationName
) {}
