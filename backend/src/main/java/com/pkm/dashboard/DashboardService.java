package com.pkm.dashboard;

import com.pkm.activity.ActivityDto;
import com.pkm.activity.ProjectActivityRepository;
import com.pkm.knowledge.KnowledgeItemRepository;
import com.pkm.org.OrgService;
import com.pkm.project.ProjectRepositoryLink;
import com.pkm.project.ProjectRepositoryLinkRepository;
import com.pkm.project.ProjectService;
import com.pkm.project.dto.ProjectSummary;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.*;

@Service
@Transactional(readOnly = true)
public class DashboardService {

    private static final int MAX_ATTENTION = 10;

    private final ProjectService projectService;
    private final ProjectActivityRepository activityRepository;
    private final KnowledgeItemRepository knowledgeRepository;
    private final ProjectRepositoryLinkRepository repoLinkRepository;
    private final OrgService orgService;

    public DashboardService(ProjectService projectService, ProjectActivityRepository activityRepository,
                            KnowledgeItemRepository knowledgeRepository,
                            ProjectRepositoryLinkRepository repoLinkRepository, OrgService orgService) {
        this.projectService = projectService;
        this.activityRepository = activityRepository;
        this.knowledgeRepository = knowledgeRepository;
        this.repoLinkRepository = repoLinkRepository;
        this.orgService = orgService;
    }

    /** @param orgId when set, only the projects of that organization are summarised */
    public DashboardDto forUser(Long userId, Long orgId) {
        List<ProjectSummary> projects = projectService.list(userId).stream()
                .filter(p -> orgId == null || orgId.equals(p.orgId()))
                .toList();
        List<Long> ids = projects.stream().map(ProjectSummary::id).toList();

        long repos = projects.stream().mapToLong(ProjectSummary::repositoryCount).sum();
        long knowledge = projects.stream().mapToLong(ProjectSummary::knowledgeItemCount).sum();
        long people = projects.stream().mapToLong(ProjectSummary::memberCount).sum();
        long synced = projects.stream().filter(p -> "Synced".equals(p.syncStatus())).count();
        long failed = projects.stream().filter(p -> Set.of("Failed", "Partially synced").contains(p.syncStatus())).count();
        long pending = projects.stream().filter(p -> Set.of("Queued", "Syncing").contains(p.syncStatus())).count();

        if (ids.isEmpty()) {
            return new DashboardDto(0, 0, 0, 0, 0, 0, 0, new DashboardDto.KnowledgeHealth(0, 0, 0),
                    List.of(), List.of(), List.of(), List.of(), List.of(), orgService.list(userId));
        }

        Instant now = Instant.now();
        Map<Long, Long> fresh = toMap(knowledgeRepository.countByProjectSince(ids, now.minus(Duration.ofDays(30))));
        Map<Long, Long> notOutdated = toMap(knowledgeRepository.countByProjectSince(ids, now.minus(Duration.ofDays(90))));

        long freshTotal = 0;
        long staleTotal = 0;
        long outdatedTotal = 0;
        Map<Long, long[]> perProject = new HashMap<>();   // [stale, outdated]
        for (ProjectSummary p : projects) {
            long total = p.knowledgeItemCount();
            long f = fresh.getOrDefault(p.id(), 0L);
            long within90 = Math.max(f, notOutdated.getOrDefault(p.id(), 0L));
            long stale = within90 - f;
            long outdated = Math.max(0, total - within90);
            freshTotal += f;
            staleTotal += stale;
            outdatedTotal += outdated;
            perProject.put(p.id(), new long[]{stale, outdated});
        }

        List<DashboardDto.TypeCount> byType = knowledgeRepository.countByType(ids).stream()
                .map(r -> new DashboardDto.TypeCount(String.valueOf(r[0]), ((Number) r[1]).longValue()))
                .sorted(Comparator.comparingLong(DashboardDto.TypeCount::count).reversed())
                .toList();

        List<DashboardDto.RecentKnowledge> recentKnowledge = knowledgeRepository
                .findRecentForProjects(ids, PageRequest.of(0, 6)).stream()
                .map(k -> new DashboardDto.RecentKnowledge(k.getId(), k.getProject().getId(), k.getProject().getName(),
                        k.getTitle(), k.getKnowledgeType(), k.getUpdatedAt()))
                .toList();

        List<ActivityDto> recent = activityRepository.findRecentForProjects(ids, PageRequest.of(0, 8))
                .stream().map(ActivityDto::from).toList();

        return new DashboardDto(projects.size(), repos, knowledge, people, synced, failed, pending,
                new DashboardDto.KnowledgeHealth(freshTotal, staleTotal, outdatedTotal),
                byType, attention(projects, perProject), recentKnowledge, recent,
                projects.stream().limit(4).toList(), orgService.list(userId));
    }

    /** What needs a human: failed syncs first, then outdated knowledge, stale knowledge and unsynced projects. */
    private List<DashboardDto.AttentionItem> attention(List<ProjectSummary> projects, Map<Long, long[]> health) {
        Map<Long, ProjectSummary> byId = new HashMap<>();
        projects.forEach(p -> byId.put(p.id(), p));

        List<DashboardDto.AttentionItem> failed = new ArrayList<>();
        List<DashboardDto.AttentionItem> outdated = new ArrayList<>();
        List<DashboardDto.AttentionItem> stale = new ArrayList<>();
        List<DashboardDto.AttentionItem> never = new ArrayList<>();

        for (ProjectRepositoryLink r : repoLinkRepository.findByProjectIdIn(byId.keySet())) {
            if (r.getSyncStatus() == ProjectRepositoryLink.SyncStatus.FAILED) {
                ProjectSummary p = byId.get(r.getProject().getId());
                String why = r.getLastSyncMessage() == null || r.getLastSyncMessage().isBlank()
                        ? "Sync failed" : r.getLastSyncMessage();
                failed.add(new DashboardDto.AttentionItem("SYNC_FAILED", p.id(), p.name(),
                        r.getRepoOwner() + "/" + r.getRepoName() + ": " + why, 1));
            }
        }
        for (ProjectSummary p : projects) {
            long[] h = health.get(p.id());
            if (h[1] > 0) {
                outdated.add(new DashboardDto.AttentionItem("OUTDATED_KNOWLEDGE", p.id(), p.name(),
                        h[1] + " knowledge item(s) not updated in over 90 days", h[1]));
            }
            if (h[0] > 0) {
                stale.add(new DashboardDto.AttentionItem("STALE_KNOWLEDGE", p.id(), p.name(),
                        h[0] + " knowledge item(s) not updated in over 30 days", h[0]));
            }
            if (p.repositoryCount() == 0) {
                never.add(new DashboardDto.AttentionItem("NO_REPOSITORIES", p.id(), p.name(),
                        "No repository linked yet", 0));
            } else if (p.lastSyncedAt() == null && !"Failed".equals(p.syncStatus())) {
                never.add(new DashboardDto.AttentionItem("NEVER_SYNCED", p.id(), p.name(),
                        "Knowledge has not been extracted yet", 0));
            }
        }
        List<DashboardDto.AttentionItem> all = new ArrayList<>();
        all.addAll(failed);
        all.addAll(outdated);
        all.addAll(stale);
        all.addAll(never);
        return all.stream().limit(MAX_ATTENTION).toList();
    }

    private static Map<Long, Long> toMap(List<Object[]> rows) {
        Map<Long, Long> m = new HashMap<>();
        for (Object[] r : rows) {
            m.put(((Number) r[0]).longValue(), ((Number) r[1]).longValue());
        }
        return m;
    }
}
