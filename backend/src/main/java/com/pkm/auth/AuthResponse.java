package com.pkm.auth;

import com.pkm.user.UserDto;

import java.time.Instant;

public record AuthResponse(String token, Instant expiresAt, UserDto user) {
}
