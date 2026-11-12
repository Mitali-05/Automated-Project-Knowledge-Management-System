package com.pkm.ingest;

import com.pkm.activity.ActivityService;
import com.pkm.common.ApiException;
import com.pkm.ingest.IngestDtos.*;
import com.pkm.integration.github.GitHubAppService;
import com.pkm.knowledge.KnowledgeEvidence;
import com.pkm.knowledge.KnowledgeItem;
import com.pkm.knowledge.KnowledgeItemRepository;
import com.pkm.notification.NotificationService;
import com.pkm.project.*;
import com.pkm.project.ProjectRepositoryLink.SyncStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;

@Service
public class IngestService {

    private final ProjectRepositoryLinkRepository repoRepository;
    private final ProjectRepository projectRepository;
    private final ProjectMemberRepository memberRepository;
    private final KnowledgeItemRepository knowledgeRepository;
    private final ActivityService activity;
    private final NotificationService notifications;
    private final GitHubAppService github;

    public IngestService(ProjectRepositoryLinkRepository repoRepository,
                         ProjectRepository projectRepository,
                         ProjectMemberRepository memberRepository,
                         KnowledgeItemRepository knowledgeRepository,
                         ActivityService activity,
                         NotificationService notifications,
                         GitHubAppService github) {
        this.repoRepository = repoRepository;
        this.projectRepository = projectRepository;
        this.memberRepository = memberRepository;
        this.knowledgeRepository = knowledgeRepository;
        this.activity = activity;
        this.notifications = notifications;
        this.github = github;
    }

    @Transactional(readOnly = true)
    public List<PendingRepository> repositories(SyncStatus status) {
        return repoRepository.findAll().stream()
                .filter(r -> status == null || r.getSyncStatus() == status)
                .map(r -> new PendingRepository(r.getId(), r.getProject().getId(), r.getProject().getName(),
                        r.getUrl(), r.getRepoOwner(), r.getRepoName(), r.getSyncStatus().name(),
                        r.getProject().getOrganization().getGithubInstallationId()))
                .toList();
    }

    @Transactional(readOnly = true)
    public TokenResponse githubToken(Long repositoryId) {
        ProjectRepositoryLink repo = loadRepo(repositoryId);
        String installationId = repo.getProject().getOrganization().getGithubInstallationId();
        if (installationId == null || installationId.isBlank()) {
            throw ApiException.notFound("This organization has not connected the GitHub App (public repositories need no token)");
        }
        return new TokenResponse(github.installationToken(installationId));
    }

    @Transactional
    public void updateStatus(Long repositoryId, StatusUpdate update) {
        ProjectRepositoryLink repo = loadRepo(repositoryId);
        SyncStatus status = SyncStatus.valueOf(update.status());
        repo.setSyncStatus(status);
        repo.setLastSyncMessage(update.message());
        Project project = repo.getProject();
        String label = repo.getRepoOwner() + "/" + repo.getRepoName();

        if (status == SyncStatus.SYNCED) {
            repo.setLastSyncedAt(Instant.now());
            activity.record(project, "SYNC_COMPLETED", "Knowledge extracted from " + label, "PRISM", repo.getUrl());
            notifyMembers(project, "Knowledge ready: " + project.getName(), "Extraction finished for " + label + ".");
        } else if (status == SyncStatus.FAILED) {
            activity.record(project, "SYNC_FAILED", "Sync failed for " + label, "PRISM", repo.getUrl());
            notifyMembers(project, "Sync failed: " + project.getName(),
                    "Extraction for " + label + " failed" + (update.message() == null ? "." : ": " + update.message()));
        }
    }

    /** Idempotent: items with a known externalId are updated, the rest are created. */
    @Transactional
    public BatchResult saveKnowledge(Long projectId, KnowledgeBatch batch) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> ApiException.notFound("Project not found"));
        ProjectRepositoryLink repo = null;
        if (batch.repositoryId() != null) {
            repo = loadRepo(batch.repositoryId());
            if (!repo.getProject().getId().equals(projectId)) {
                throw ApiException.badRequest("repositoryId does not belong to this project");
            }
        }
        int created = 0;
        int updated = 0;
        for (KnowledgeIn in : batch.items()) {
            KnowledgeItem item = in.externalId() == null ? null
                    : knowledgeRepository.findByProjectIdAndExternalId(projectId, in.externalId()).orElse(null);
            boolean isNew = item == null;
            if (isNew) {
                item = new KnowledgeItem();
                item.setProject(project);
                item.setExternalId(in.externalId());
            }
            item.setRepository(repo != null ? repo : item.getRepository());
            item.setTitle(in.title().trim());
            item.setKnowledgeType(in.type().trim());
            item.setSummary(in.summary().trim());
            item.setDetails(in.details());
            item.setModule(in.module());
            item.setConfidence(in.confidence());
            item.setUpdatedAt(Instant.now());

            item.getEvidence().clear();
            if (in.evidence() != null) {
                for (EvidenceIn e : in.evidence()) {
                    KnowledgeEvidence ev = new KnowledgeEvidence();
                    ev.setItem(item);
                    ev.setSourceType(e.type());
                    ev.setSourceRef(e.reference());
                    ev.setUrl(e.url());
                    ev.setExcerpt(e.excerpt());
                    item.getEvidence().add(ev);
                }
            }
            knowledgeRepository.save(item);
            if (isNew) {
                created++;
            } else {
                updated++;
            }
        }
        project.setUpdatedAt(Instant.now());
        return new BatchResult(created, updated);
    }

    @Transactional
    public BatchResult saveActivity(Long projectId, ActivityBatch batch) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> ApiException.notFound("Project not found"));
        int created = 0;
        for (ActivityIn e : batch.events()) {
            String repoUrl = null;
            if (e.repositoryId() != null) {
                ProjectRepositoryLink repo = loadRepo(e.repositoryId());
                if (!repo.getProject().getId().equals(projectId)) {
                    throw ApiException.badRequest("repositoryId does not belong to this project");
                }
                repoUrl = repo.getUrl();
            }
            activity.record(project, e.type(), e.title(), e.actor(), repoUrl, e.sourceRef(), e.url(), e.occurredAt());
            created++;
        }
        return new BatchResult(created, 0);
    }

    private ProjectRepositoryLink loadRepo(Long id) {
        return repoRepository.findById(id).orElseThrow(() -> ApiException.notFound("Repository not found"));
    }

    private void notifyMembers(Project project, String title, String description) {
        memberRepository.findByProjectIdWithUser(project.getId())
                .forEach(m -> notifications.notify(m.getUser(), title, description));
    }
}
