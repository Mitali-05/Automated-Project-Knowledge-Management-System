package com.pkm.project.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;

public record CreateProjectRequest(
        /** The organization (or personal workspace) the project belongs to. The caller must be a member. */
        @NotNull(message = "Organization is required") Long orgId,
        @NotBlank(message = "Project name is required") @Size(max = 120, message = "Project name is too long") String name,
        @Size(max = 2000, message = "Description is too long") String description,
        /** One project can span several repositories. */
        @Size(max = 20, message = "A project can have at most 20 repositories") List<String> repositoryUrls,
        /** Teammates (who must belong to the same organization) to add as contributors. */
        @Size(max = 100, message = "Too many contributors") List<Long> contributorIds
) {
}
