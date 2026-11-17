package com.pkm.freshness;

import java.time.Instant;
import java.util.List;

public class FreshnessDtos {

    public record FreshnessOverviewDto(
            Long projectId,
            long currentCount,
            long potentiallyStaleCount,
            long outdatedCount,
            long unknownCount,
            long totalCount,
            Instant lastSyncAt,
            String lastSnapshotCommit
    ) {}

    public record AffectedKnowledgeDto(
            Long knowledgeId,
            String title,
            String module,
            String changeStatus,
            String ageStatus,
            String lastVerifiedCommit,
            String affectedCommit,
            List<String> changedFiles,
            String reason,
            Instant detectedAt
    ) {}

    public record ChangeHistoryItemDto(
            Long id,
            String commitSha,
            String changeType,
            String filePath,
            String author,
            String commitMessage,
            Instant detectedAt
    ) {}

    public record KnowledgeFreshnessDetailDto(
            Long knowledgeId,
            String title,
            String module,
            String changeStatus,
            String ageStatus,
            String lastVerifiedCommit,
            String affectedCommit,
            List<String> changedFiles,
            String reason,
            Instant detectedAt,
            Instant lastVerifiedAt,
            String revalidationStatus,
            List<ChangeHistoryItemDto> history
    ) {}
}
