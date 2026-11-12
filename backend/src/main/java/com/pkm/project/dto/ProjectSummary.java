package com.pkm.project.dto;

import java.time.Instant;

public record ProjectSummary(Long id, Long orgId, String orgName, String orgType, String name, String description,
                             String role,
                             int repositoryCount, int memberCount, long knowledgeItemCount,
                             String syncStatus, Instant lastSyncedAt, Instant createdAt, Instant updatedAt) {
}
