package com.pkm.project.dto;

import java.time.Instant;

public record SyncHistoryDto(
        Long id,
        Long repositoryId,
        String repositoryName,
        String status,
        int progress,
        String statusMessage,
        Instant startedAt,
        Instant completedAt,
        Integer durationSeconds,
        Integer itemsExtracted,
        Double trustScore,
        String errorMessage
) {
}
