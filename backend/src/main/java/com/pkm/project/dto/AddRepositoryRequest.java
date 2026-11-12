package com.pkm.project.dto;

import jakarta.validation.constraints.NotBlank;

public record AddRepositoryRequest(@NotBlank(message = "Repository URL is required") String url) {
}
