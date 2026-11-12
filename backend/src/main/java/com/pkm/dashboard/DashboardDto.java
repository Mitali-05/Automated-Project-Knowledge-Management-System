package com.pkm.dashboard;

import com.pkm.activity.ActivityDto;
import com.pkm.org.OrgDtos;
import com.pkm.project.dto.ProjectSummary;

import java.time.Instant;
import java.util.List;

public record DashboardDto(
        long projectCount, long repositoryCount, long knowledgeItemCount, long contributorCount,
        /** Projects by overall sync state. */
        long syncedProjects, long failedProjects, long pendingProjects,
        KnowledgeHealth health,
        List<TypeCount> knowledgeByType,
        List<AttentionItem> attention,
        List<RecentKnowledge> recentKnowledge,
        List<ActivityDto> recentActivity,
        List<ProjectSummary> recentProjects,
        List<OrgDtos.Summary> organizations) {

    /** Fresh = updated within 30 days, Stale = within 90 days, Outdated = older. */
    public record KnowledgeHealth(long fresh, long stale, long outdated) {
    }

    public record TypeCount(String type, long count) {
    }

    /** kind: SYNC_FAILED | OUTDATED_KNOWLEDGE | STALE_KNOWLEDGE | NEVER_SYNCED | NO_REPOSITORIES. */
    public record AttentionItem(String kind, Long projectId, String projectName, String message, long count) {
    }

    public record RecentKnowledge(Long id, Long projectId, String projectName, String title, String knowledgeType,
                                  Instant updatedAt) {
    }
}
