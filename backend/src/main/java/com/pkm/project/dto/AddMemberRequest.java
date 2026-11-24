package com.pkm.project.dto;

import com.pkm.project.ProjectMember;
import jakarta.validation.constraints.NotNull;

public record AddMemberRequest(@NotNull(message = "Choose a person to add") Long userId, ProjectMember.Role role) {
    public AddMemberRequest(Long userId) { this(userId, null); }
}
