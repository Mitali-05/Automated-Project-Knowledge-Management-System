package com.pkm.project.dto;

import jakarta.validation.constraints.NotNull;

public record AddMemberRequest(@NotNull(message = "Choose a person to add") Long userId) {
}
