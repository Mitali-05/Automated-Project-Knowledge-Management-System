package com.pkm.project.dto;

import java.time.Instant;

public record SyncStatusDto(
        Long id,
        Long projectId,
        Long repositoryId,
        String repositoryName,
        String status,
        int progress,
        String stage,
        String statusMessage,
        String logs,
        Instant startedAt,
        Instant completedAt,
        Integer durationSeconds,
        Integer itemsExtracted,
        Double trustScore,
        String errorMessage,
        boolean active
) {
}
