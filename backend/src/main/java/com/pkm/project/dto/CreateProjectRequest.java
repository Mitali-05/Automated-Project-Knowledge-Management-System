package com.pkm.project.dto;

import jakarta.validation.constraints.NotBlank;

import java.util.List;

public record CreateProjectRequest(
        @NotBlank String name,
        String description,
        List<String> urls
) {}
