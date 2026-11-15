package com.pkm.freshness;

import com.pkm.common.ApiException;
import com.pkm.freshness.FreshnessDtos.*;
import com.pkm.integration.github.GitHubAppService;
import com.pkm.integration.github.GitHubAppService.CommitInfo;
import com.pkm.integration.github.GitHubAppService.CompareResult;
import com.pkm.integration.github.GitHubAppService.FileChange;
import com.pkm.knowledge.KnowledgeEvidence;
import com.pkm.knowledge.KnowledgeItem;
import com.pkm.knowledge.KnowledgeItemRepository;
import com.pkm.project.Project;
import com.pkm.project.ProjectAccess;
import com.pkm.project.ProjectRepository;
import com.pkm.project.ProjectRepositoryLink;
import com.pkm.project.ProjectRepositoryLinkRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.*;

@Service
@Transactional
public class FreshnessService {

    private static final Logger log = LoggerFactory.getLogger(FreshnessService.class);

    private final RepositorySnapshotRepository snapshotRepository;
    private final RepositoryChangeRepository changeRepository;
    private final KnowledgeFreshnessRepository freshnessRepository;
    private final KnowledgeChangeLinkRepository linkRepository;
    private final KnowledgeItemRepository knowledgeRepository;
    private final ProjectRepository projectRepository;
    private final ProjectRepositoryLinkRepository repoRepository;
    private final ProjectAccess access;
    private final GitHubAppService github;

    public FreshnessService(
            RepositorySnapshotRepository snapshotRepository,
            RepositoryChangeRepository changeRepository,
            KnowledgeFreshnessRepository freshnessRepository,
            KnowledgeChangeLinkRepository linkRepository,
            KnowledgeItemRepository knowledgeRepository,
            ProjectRepository projectRepository,
            ProjectRepositoryLinkRepository repoRepository,
            ProjectAccess access,
            GitHubAppService github) {
        this.snapshotRepository = snapshotRepository;
        this.changeRepository = changeRepository;
        this.freshnessRepository = freshnessRepository;
        this.linkRepository = linkRepository;
        this.knowledgeRepository = knowledgeRepository;
        this.projectRepository = projectRepository;
        this.repoRepository = repoRepository;
        this.access = access;
        this.github = github;
    }

    public void recordSyncBaseline(ProjectRepositoryLink repo, String optionalCommitSha) {
        String owner = repo.getRepoOwner();
        String name = repo.getRepoName();
        String installationId = repo.getProject().getOrganization().getGithubInstallationId();

        String commitSha = optionalCommitSha;
        if (commitSha == null || commitSha.isBlank()) {
            CommitInfo head = github.getHeadCommit(owner, name, installationId);
            if (head != null) {
                commitSha = head.sha();
            }
        }
        if (commitSha == null || commitSha.isBlank()) {
            commitSha = "baseline-" + Instant.now().toEpochMilli();
        }

        Optional<RepositorySnapshot> prevOpt = snapshotRepository
                .findFirstByRepositoryIdAndSyncStatusOrderByCreatedAtDesc(repo.getId(), "SYNCED");

        RepositorySnapshot snapshot = new RepositorySnapshot();
        snapshot.setRepository(repo);
        snapshot.setProject(repo.getProject());
        snapshot.setCommitSha(commitSha);
        snapshot.setSyncStatus("SYNCED");
        snapshot.setCreatedAt(Instant.now());
        snapshotRepository.save(snapshot);

        if (prevOpt.isPresent()) {
            RepositorySnapshot prev = prevOpt.get();
            if (!prev.getCommitSha().equals(commitSha) && !prev.getCommitSha().startsWith("baseline-") && !commitSha.startsWith("baseline-")) {
                CompareResult cmp = github.compareCommits(owner, name, prev.getCommitSha(), commitSha, installationId);
                for (FileChange fc : cmp.files()) {
                    if (!changeRepository.existsByRepositoryIdAndToCommitAndFilePath(repo.getId(), commitSha, fc.filename())) {
                        RepositoryChange change = new RepositoryChange();
                        change.setRepository(repo);
                        change.setProject(repo.getProject());
                        change.setFromCommit(prev.getCommitSha());
                        change.setToCommit(commitSha);
                        change.setFilePath(fc.filename());
                        change.setChangeType(fc.status() != null ? fc.status().toUpperCase() : "MODIFIED");
                        change.setCommitMessage("Comparison between " + prev.getCommitSha().substring(0, Math.min(7, prev.getCommitSha().length())) + " and " + commitSha.substring(0, Math.min(7, commitSha.length())));
                        change.setDetectedAt(Instant.now());
                        changeRepository.save(change);
                    }
                }
            }
        }

        evaluateDriftForRepository(repo, commitSha);
    }

    public void evaluateDriftForRepository(ProjectRepositoryLink repo, String currentCommit) {
        List<KnowledgeItem> items = knowledgeRepository.findAllWithEvidence(repo.getProject().getId())
                .stream()
                .filter(k -> k.getRepository() != null && k.getRepository().getId().equals(repo.getId()))
                .toList();

        List<RepositoryChange> changes = changeRepository.findByRepositoryIdOrderByDetectedAtDesc(repo.getId());

        for (KnowledgeItem item : items) {
            evaluateKnowledgeItem(item, changes, currentCommit);
        }
    }

    public void evaluateKnowledgeItem(KnowledgeItem item, List<RepositoryChange> changes, String currentCommit) {
        KnowledgeFreshness freshness = freshnessRepository.findByKnowledgeItemId(item.getId())
                .orElseGet(() -> {
                    KnowledgeFreshness f = new KnowledgeFreshness();
                    f.setKnowledgeItem(item);
                    f.setProject(item.getProject());
                    f.setRepository(item.getRepository());
                    return f;
                });

        freshness.setAgeStatus(deriveAgeStatus(item.getUpdatedAt()));

        List<String> affectedFiles = new ArrayList<>();
        List<KnowledgeChangeLink> newLinks = new ArrayList<>();
        boolean hasFileEvidence = false;
        boolean hasDeletedFile = false;

        for (KnowledgeEvidence ev : item.getEvidence()) {
            String path = extractFilePath(ev);
            if (path != null && !path.isBlank()) {
                hasFileEvidence = true;
                for (RepositoryChange change : changes) {
                    if (isPathMatch(path, change.getFilePath())) {
                        affectedFiles.add(change.getFilePath());
                        if ("REMOVED".equalsIgnoreCase(change.getChangeType()) || "DELETED".equalsIgnoreCase(change.getChangeType())) {
                            hasDeletedFile = true;
                        }
                        KnowledgeChangeLink link = new KnowledgeChangeLink();
                        link.setKnowledgeItem(item);
                        link.setRepositoryChange(change);
                        link.setMatchedFile(change.getFilePath());
                        link.setMatchedEvidence(ev);
                        newLinks.add(link);
                    }
                }
            }
        }

        if (!hasFileEvidence) {
            freshness.setChangeStatus("UNKNOWN");
            freshness.setReason("No file-level evidence found to track changes against repository commits.");
        } else if (!affectedFiles.isEmpty()) {
            freshness.setChangeStatus(hasDeletedFile ? "OUTDATED" : "POTENTIALLY_STALE");
            freshness.setAffectedCommit(changes.isEmpty() ? null : changes.get(0).getToCommit());
            freshness.setChangedFiles(String.join(",", affectedFiles.stream().distinct().toList()));
            freshness.setReason("Supporting source files have been modified in recent commits: "
                    + String.join(", ", affectedFiles.stream().distinct().limit(3).toList()));
            freshness.setDetectedAt(Instant.now());

            linkRepository.deleteByKnowledgeItemId(item.getId());
            linkRepository.saveAll(newLinks);
        } else {
            freshness.setChangeStatus("CURRENT");
            freshness.setLastVerifiedCommit(currentCommit);
            freshness.setChangedFiles(null);
            freshness.setReason("No changes detected in supporting source files since last extraction baseline.");
            freshness.setLastVerifiedAt(Instant.now());
        }

        freshnessRepository.save(freshness);
    }

    public FreshnessOverviewDto getOverview(Long projectId, Long userId) {
        access.requireMember(projectId, userId);
        return calculateOverview(projectId);
    }

    public List<AffectedKnowledgeDto> getAffected(Long projectId, Long userId) {
        access.requireMember(projectId, userId);
        return freshnessRepository.findAffectedByProjectId(projectId).stream()
                .map(this::toAffectedDto)
                .toList();
    }

    public KnowledgeFreshnessDetailDto getDetail(Long projectId, Long knowledgeId, Long userId) {
        access.requireMember(projectId, userId);
        KnowledgeItem item = knowledgeRepository.findOneWithEvidence(knowledgeId, projectId)
                .orElseThrow(() -> ApiException.notFound("Knowledge item not found"));

        KnowledgeFreshness freshness = freshnessRepository.findByKnowledgeItemId(knowledgeId)
                .orElseGet(() -> {
                    KnowledgeFreshness f = new KnowledgeFreshness();
                    f.setKnowledgeItem(item);
                    f.setProject(item.getProject());
                    f.setRepository(item.getRepository());
                    f.setAgeStatus(deriveAgeStatus(item.getUpdatedAt()));
                    f.setChangeStatus("CURRENT");
                    return freshnessRepository.save(f);
                });

        List<ChangeHistoryItemDto> history = linkRepository.findByKnowledgeItemId(knowledgeId).stream()
                .map(link -> {
                    RepositoryChange c = link.getRepositoryChange();
                    return new ChangeHistoryItemDto(
                            c.getId(),
                            c.getToCommit(),
                            c.getChangeType(),
                            c.getFilePath(),
                            c.getAuthor(),
                            c.getCommitMessage(),
                            c.getDetectedAt()
                    );
                })
                .toList();

        List<String> files = freshness.getChangedFiles() != null && !freshness.getChangedFiles().isBlank()
                ? Arrays.asList(freshness.getChangedFiles().split(","))
                : List.of();

        return new KnowledgeFreshnessDetailDto(
                item.getId(),
                item.getTitle(),
                item.getModule(),
                freshness.getChangeStatus(),
                freshness.getAgeStatus(),
                freshness.getLastVerifiedCommit(),
                freshness.getAffectedCommit(),
                files,
                freshness.getReason(),
                freshness.getDetectedAt(),
                freshness.getLastVerifiedAt(),
                freshness.getRevalidationStatus(),
                history
        );
    }

    public FreshnessOverviewDto recheckProject(Long projectId, Long userId) {
        access.requireMember(projectId, userId);
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> ApiException.notFound("Project not found"));

        List<ProjectRepositoryLink> repos = repoRepository.findByProjectIdOrderByAddedAtAsc(projectId);
        for (ProjectRepositoryLink repo : repos) {
            String owner = repo.getRepoOwner();
            String name = repo.getRepoName();
            String installationId = project.getOrganization().getGithubInstallationId();

            CommitInfo head = github.getHeadCommit(owner, name, installationId);
            if (head != null && head.sha() != null) {
                Optional<RepositorySnapshot> latestSnapshot = snapshotRepository
                        .findFirstByRepositoryIdAndSyncStatusOrderByCreatedAtDesc(repo.getId(), "SYNCED");

                if (latestSnapshot.isPresent()) {
                    String prevSha = latestSnapshot.get().getCommitSha();
                    if (!prevSha.equals(head.sha())) {
                        CompareResult cmp = github.compareCommits(owner, name, prevSha, head.sha(), installationId);
                        for (FileChange fc : cmp.files()) {
                            if (!changeRepository.existsByRepositoryIdAndToCommitAndFilePath(repo.getId(), head.sha(), fc.filename())) {
                                RepositoryChange c = new RepositoryChange();
                                c.setRepository(repo);
                                c.setProject(project);
                                c.setFromCommit(prevSha);
                                c.setToCommit(head.sha());
                                c.setFilePath(fc.filename());
                                c.setChangeType(fc.status() != null ? fc.status().toUpperCase() : "MODIFIED");
                                c.setCommitMessage(head.message());
                                c.setAuthor(head.author());
                                c.setDetectedAt(Instant.now());
                                changeRepository.save(c);
                            }
                        }
                        RepositorySnapshot newSnapshot = new RepositorySnapshot();
                        newSnapshot.setRepository(repo);
                        newSnapshot.setProject(project);
                        newSnapshot.setCommitSha(head.sha());
                        newSnapshot.setSyncStatus("SYNCED");
                        newSnapshot.setCreatedAt(Instant.now());
                        snapshotRepository.save(newSnapshot);
                    }
                } else {
                    RepositorySnapshot newSnapshot = new RepositorySnapshot();
                    newSnapshot.setRepository(repo);
                    newSnapshot.setProject(project);
                    newSnapshot.setCommitSha(head.sha());
                    newSnapshot.setSyncStatus("SYNCED");
                    newSnapshot.setCreatedAt(Instant.now());
                    snapshotRepository.save(newSnapshot);
                }
            }

            String currentCommit = head != null ? head.sha() : null;
            evaluateDriftForRepository(repo, currentCommit);
        }

        return calculateOverview(projectId);
    }

    public KnowledgeFreshnessDetailDto revalidateItem(Long projectId, Long knowledgeId, Long userId) {
        access.requireMember(projectId, userId);
        KnowledgeItem item = knowledgeRepository.findOneWithEvidence(knowledgeId, projectId)
                .orElseThrow(() -> ApiException.notFound("Knowledge item not found"));

        KnowledgeFreshness freshness = freshnessRepository.findByKnowledgeItemId(knowledgeId)
                .orElseGet(() -> {
                    KnowledgeFreshness f = new KnowledgeFreshness();
                    f.setKnowledgeItem(item);
                    f.setProject(item.getProject());
                    f.setRepository(item.getRepository());
                    return f;
                });

        freshness.setChangeStatus("CURRENT");
        freshness.setRevalidationStatus("REVALIDATED");
        freshness.setReason("Revalidated by user verification against recent repository state.");
        freshness.setLastVerifiedAt(Instant.now());
        freshness.setChangedFiles(null);
        linkRepository.deleteByKnowledgeItemId(knowledgeId);
        freshnessRepository.save(freshness);

        return getDetail(projectId, knowledgeId, userId);
    }

    private FreshnessOverviewDto calculateOverview(Long projectId) {
        long current = freshnessRepository.countByProjectIdAndChangeStatus(projectId, "CURRENT");
        long stale = freshnessRepository.countByProjectIdAndChangeStatus(projectId, "POTENTIALLY_STALE");
        long outdated = freshnessRepository.countByProjectIdAndChangeStatus(projectId, "OUTDATED");
        long unknown = freshnessRepository.countByProjectIdAndChangeStatus(projectId, "UNKNOWN");
        long total = knowledgeRepository.countByProjectId(projectId);

        List<RepositorySnapshot> snaps = snapshotRepository.findByProjectIdOrderByCreatedAtDesc(projectId);
        Instant lastSync = snaps.isEmpty() ? null : snaps.get(0).getCreatedAt();
        String lastSha = snaps.isEmpty() ? null : snaps.get(0).getCommitSha();

        return new FreshnessOverviewDto(projectId, current, stale, outdated, unknown, total, lastSync, lastSha);
    }

    private AffectedKnowledgeDto toAffectedDto(KnowledgeFreshness f) {
        List<String> files = f.getChangedFiles() != null && !f.getChangedFiles().isBlank()
                ? Arrays.asList(f.getChangedFiles().split(","))
                : List.of();

        return new AffectedKnowledgeDto(
                f.getKnowledgeItem().getId(),
                f.getKnowledgeItem().getTitle(),
                f.getKnowledgeItem().getModule(),
                f.getChangeStatus(),
                f.getAgeStatus(),
                f.getLastVerifiedCommit(),
                f.getAffectedCommit(),
                files,
                f.getReason(),
                f.getDetectedAt()
        );
    }

    private String deriveAgeStatus(Instant updatedAt) {
        if (updatedAt == null) return "FRESH";
        long days = Duration.between(updatedAt, Instant.now()).toDays();
        if (days <= 30) return "FRESH";
        return days <= 90 ? "STALE" : "OUTDATED";
    }

    private String extractFilePath(KnowledgeEvidence ev) {
        if (ev.getSourceRef() != null && (ev.getSourceRef().contains("/") || ev.getSourceRef().contains("."))) {
            return cleanPath(ev.getSourceRef());
        }
        if (ev.getUrl() != null && ev.getUrl().contains("/blob/")) {
            String[] parts = ev.getUrl().split("/blob/[^/]+/");
            if (parts.length > 1) {
                return cleanPath(parts[1]);
            }
        }
        return null;
    }

    private String cleanPath(String raw) {
        String p = raw.trim();
        int hashIdx = p.indexOf('#');
        if (hashIdx >= 0) p = p.substring(0, hashIdx);
        int qIdx = p.indexOf('?');
        if (qIdx >= 0) p = p.substring(0, qIdx);
        return p.replace('\\', '/').replaceAll("^/+", "");
    }

    private boolean isPathMatch(String evidencePath, String changedPath) {
        if (evidencePath == null || changedPath == null) return false;
        String e = cleanPath(evidencePath).toLowerCase();
        String c = cleanPath(changedPath).toLowerCase();
        return e.equals(c) || c.endsWith("/" + e) || e.endsWith("/" + c);
    }
}
