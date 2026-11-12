package com.pkm.project.dto;

import com.pkm.project.ProjectMember;

import java.time.Instant;

public record MemberDto(Long userId, String name, String email, String role, Instant addedAt) {

    /** Call inside a transaction (the user is lazy). */
    public static MemberDto from(ProjectMember m) {
        return new MemberDto(m.getUser().getId(), m.getUser().getName(), m.getUser().getEmail(),
                m.getRole().name(), m.getAddedAt());
    }
}
