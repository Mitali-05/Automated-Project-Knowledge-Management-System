package com.pkm.project.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record UpdateProjectRequest(
        @NotBlank(message = "Project name is required") @Size(max = 120, message = "Project name is too long") String name,
        @Size(max = 2000, message = "Description is too long") String description
) {
}
