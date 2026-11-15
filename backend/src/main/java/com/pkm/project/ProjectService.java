package com.pkm.project;

import com.pkm.activity.ActivityService;
import com.pkm.common.ApiException;
import com.pkm.ingest.ExtractionBridgeService;
import com.pkm.knowledge.KnowledgeItemRepository;
import com.pkm.notification.NotificationService;
import com.pkm.org.OrgAccess;
import com.pkm.org.Organization;
import com.pkm.org.OrganizationMemberRepository;
import com.pkm.project.ProjectRepositoryLink.SyncStatus;
import com.pkm.project.dto.*;
import com.pkm.user.User;
import com.pkm.user.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.*;

@Service
@Transactional(readOnly = true)
public class ProjectService {

    private final ProjectRepository projectRepository;
    private final ProjectMemberRepository memberRepository;
    private final ProjectRepositoryLinkRepository repoLinkRepository;
    private final KnowledgeItemRepository knowledgeRepository;
    private final UserRepository userRepository;
    private final ProjectAccess access;
    private final OrgAccess orgAccess;
    private final OrganizationMemberRepository orgMembers;
    private final ActivityService activity;
    private final NotificationService notifications;
    private final ExtractionBridgeService extractionBridgeService;
    private final ExtractionJobRepository extractionJobRepository;

    public ProjectService(ProjectRepository projectRepository,
                          ProjectMemberRepository memberRepository,
                          ProjectRepositoryLinkRepository repoLinkRepository,
                          KnowledgeItemRepository knowledgeRepository,
                          UserRepository userRepository,
                          ProjectAccess access,
                          OrgAccess orgAccess,
                          OrganizationMemberRepository orgMembers,
                          ActivityService activity,
                          NotificationService notifications,
                          ExtractionBridgeService extractionBridgeService,
                          ExtractionJobRepository extractionJobRepository) {
        this.projectRepository = projectRepository;
        this.memberRepository = memberRepository;
        this.repoLinkRepository = repoLinkRepository;
        this.knowledgeRepository = knowledgeRepository;
        this.userRepository = userRepository;
        this.access = access;
        this.orgAccess = orgAccess;
        this.orgMembers = orgMembers;
        this.activity = activity;
        this.notifications = notifications;
        this.extractionBridgeService = extractionBridgeService;
        this.extractionJobRepository = extractionJobRepository;
    }

    // ------------------------------------------------------------------ queries

    /** Only the projects the caller is a member of - everything else is invisible. */
    public List<ProjectSummary> list(Long userId) {
        return memberRepository.findByUserIdWithProject(userId).stream()
                .map(m -> summarize(m.getProject(), m.getRole()))
                .toList();
    }

    public ProjectDetail get(Long projectId, Long userId) {
        ProjectMember me = access.requireMember(projectId, userId);
        return detail(me.getProject(), me.getRole());
    }

    // ------------------------------------------------------------------ project lifecycle

    @Transactional
    public ProjectDetail create(Long userId, CreateProjectRequest req) {
        User creator = loadUser(userId);
        // Must belong to the chosen organization (404 otherwise, so other organizations stay invisible).
        Organization org = orgAccess.requireMember(req.orgId(), userId).getOrganization();

        // Validate everything before saving anything.
        Map<String, GithubRepoRef> repos = new LinkedHashMap<>();
        if (req.repositoryUrls() != null) {
            for (String raw : req.repositoryUrls()) {
                if (raw == null || raw.isBlank()) {
                    continue;
                }
                GithubRepoRef ref = GithubRepoRef.parse(raw);
                repos.putIfAbsent(ref.canonicalUrl().toLowerCase(Locale.ROOT), ref);
            }
        }
        List<User> contributors = resolveContributors(creator, org, req.contributorIds());

        Project project = new Project();
        project.setOrganization(org);
        project.setName(req.name().trim());
        project.setDescription(blankToNull(req.description()));
        project.setCreatedBy(creator);
        project = projectRepository.save(project);

        addMember(project, creator, ProjectMember.Role.owner);
        activity.record(project, "PROJECT_CREATED", "Project created", creator.getName(), null);

        for (GithubRepoRef ref : repos.values()) {
            linkRepository(project, ref, creator);
        }
        for (User contributor : contributors) {
            addMember(project, contributor, ProjectMember.Role.contributor);
            activity.record(project, "MEMBER_ADDED", contributor.getName() + " joined as a contributor",
                    creator.getName(), null);
            notifications.notify(contributor, "Added to " + project.getName(),
                    creator.getName() + " added you as a contributor.");
        }
        return detail(project, ProjectMember.Role.owner);
    }

    @Transactional
    public ProjectDetail update(Long projectId, Long userId, UpdateProjectRequest req) {
        ProjectMember me = access.requireOwner(projectId, userId);
        Project project = me.getProject();
        project.setName(req.name().trim());
        project.setDescription(blankToNull(req.description()));
        project.setUpdatedAt(Instant.now());
        return detail(projectRepository.save(project), me.getRole());
    }

    @Transactional
    public void delete(Long projectId, Long userId) {
        ProjectMember me = access.requireOwner(projectId, userId);
        projectRepository.delete(me.getProject());   // members, repositories, knowledge, activity cascade in the DB
    }

    // ------------------------------------------------------------------ repositories

    @Transactional
    public RepositoryDto addRepository(Long projectId, Long userId, String url) {
        ProjectMember me = access.requireOwner(projectId, userId);
        GithubRepoRef ref = GithubRepoRef.parse(url);
        if (repoLinkRepository.existsByProjectIdAndUrlIgnoreCase(projectId, ref.canonicalUrl())) {
            throw ApiException.conflict("This repository is already linked to the project");
        }
        ProjectRepositoryLink link = linkRepository(me.getProject(), ref, me.getUser());
        touch(me.getProject());
        extractionBridgeService.triggerExtraction();
        return RepositoryDto.from(link);
    }

    @Transactional
    public void removeRepository(Long projectId, Long repositoryId, Long userId) {
        ProjectMember me = access.requireOwner(projectId, userId);
        ProjectRepositoryLink link = repoLinkRepository.findById(repositoryId)
                .filter(r -> r.getProject().getId().equals(projectId))
                .orElseThrow(() -> ApiException.notFound("Repository not found"));
        repoLinkRepository.delete(link);
        activity.record(me.getProject(), "REPOSITORY_REMOVED",
                "Repository " + link.getRepoOwner() + "/" + link.getRepoName() + " unlinked",
                me.getUser().getName(), link.getUrl());
        touch(me.getProject());
    }

    @Transactional
    public int requestSync(Long projectId, Long userId) {
        ProjectMember me = access.requireMember(projectId, userId);
        List<ProjectRepositoryLink> repos = repoLinkRepository.findByProjectIdOrderByAddedAtAsc(projectId);
        if (repos.isEmpty()) {
            throw ApiException.badRequest("Link at least one repository before syncing");
        }
        int queued = 0;
        for (ProjectRepositoryLink r : repos) {
            if (r.getSyncStatus() != SyncStatus.SYNCING) {
                r.setSyncStatus(SyncStatus.PENDING);
                r.setLastSyncMessage(null);
                queued++;

                ExtractionJob job = new ExtractionJob();
                job.setProject(me.getProject());
                job.setRepository(r);
                job.setStatus("PENDING");
                job.setProgress(10);
                job.setStatusMessage("Queued for repository synchronization");
                job.setLogs("STATUS: 10 | QUEUED | Repository queued for extraction (" + r.getRepoOwner() + "/" + r.getRepoName() + ")\n");
                job.setTriggeredBy(me.getUser());
                job.setStartedAt(Instant.now());
                job.setItemsExtracted(0);
                extractionJobRepository.save(job);
            }
        }
        activity.record(me.getProject(), "SYNC_REQUESTED", "Knowledge sync requested", me.getUser().getName(), null);
        if (queued > 0) {
            extractionBridgeService.triggerExtraction();
        }
        return queued;
    }

    public SyncStatusDto getSyncStatus(Long projectId, Long userId) {
        access.requireMember(projectId, userId);
        List<ExtractionJob> activeJobs = extractionJobRepository.findActiveJobs(projectId);
        ExtractionJob job = null;
        if (!activeJobs.isEmpty()) {
            job = activeJobs.get(0);
        } else {
            job = extractionJobRepository.findFirstByProjectIdOrderByStartedAtDesc(projectId).orElse(null);
        }

        if (job == null) {
            return new SyncStatusDto(null, projectId, null, null, "IDLE", 0, "Idle", "No sync jobs found", null, null, null, 0, 0, null, null, false);
        }

        boolean active = "PENDING".equalsIgnoreCase(job.getStatus()) || "RUNNING".equalsIgnoreCase(job.getStatus());
        int elapsed = job.getDurationSeconds() != null ? job.getDurationSeconds()
                : (int) java.time.Duration.between(job.getStartedAt(), job.getCompletedAt() != null ? job.getCompletedAt() : Instant.now()).toSeconds();

        String repoName = job.getRepository() != null ? job.getRepository().getRepoOwner() + "/" + job.getRepository().getRepoName() : null;
        String stage = resolveStage(job.getProgress(), job.getStatus());

        return new SyncStatusDto(
                job.getId(),
                job.getProject().getId(),
                job.getRepository() != null ? job.getRepository().getId() : null,
                repoName,
                job.getStatus(),
                job.getProgress(),
                stage,
                job.getStatusMessage(),
                job.getLogs(),
                job.getStartedAt(),
                job.getCompletedAt(),
                elapsed,
                job.getItemsExtracted(),
                job.getTrustScore(),
                job.getErrorMessage(),
                active
        );
    }

    public List<SyncHistoryDto> getSyncHistory(Long projectId, Long userId) {
        access.requireMember(projectId, userId);
        return extractionJobRepository.findByProjectIdOrderByStartedAtDesc(projectId).stream()
                .limit(20)
                .map(j -> new SyncHistoryDto(
                        j.getId(),
                        j.getRepository() != null ? j.getRepository().getId() : null,
                        j.getRepository() != null ? j.getRepository().getRepoOwner() + "/" + j.getRepository().getRepoName() : null,
                        j.getStatus(),
                        j.getProgress(),
                        j.getStatusMessage(),
                        j.getStartedAt(),
                        j.getCompletedAt(),
                        j.getDurationSeconds(),
                        j.getItemsExtracted(),
                        j.getTrustScore(),
                        j.getErrorMessage()
                ))
                .toList();
    }

    private String resolveStage(int progress, String status) {
        if ("FAILED".equalsIgnoreCase(status)) return "Extraction Failed";
        if ("COMPLETED".equalsIgnoreCase(status) || progress >= 100) return "Completed";
        if (progress < 20) return "Initializing Pipeline";
        if (progress < 40) return "Connecting & Fetching Tree";
        if (progress < 65) return "AI Knowledge Extraction";
        if (progress < 85) return "Vector Embeddings & Ingestion";
        return "Finalizing Blueprints";
    }

    // ------------------------------------------------------------------ members

    @Transactional
    public MemberDto addMember(Long projectId, Long userId, Long newUserId) {
        ProjectMember me = access.requireOwner(projectId, userId);
        User newcomer = loadUser(newUserId);
        if (!orgMembers.existsByOrganizationIdAndUserId(me.getProject().getOrganization().getId(), newUserId)) {
            // Same answer as "no such user" so the API cannot be used to probe other organizations.
            throw ApiException.notFound("User not found in this project's organization");
        }
        if (memberRepository.findByProjectIdAndUserId(projectId, newUserId).isPresent()) {
            throw ApiException.conflict("This person is already on the project");
        }
        ProjectMember added = addMember(me.getProject(), newcomer, ProjectMember.Role.contributor);
        activity.record(me.getProject(), "MEMBER_ADDED", newcomer.getName() + " joined as a contributor",
                me.getUser().getName(), null);
        notifications.notify(newcomer, "Added to " + me.getProject().getName(),
                me.getUser().getName() + " added you as a contributor.");
        touch(me.getProject());
        return MemberDto.from(added);
    }

    @Transactional
    public void removeMember(Long projectId, Long userId, Long targetUserId) {
        ProjectMember me = access.requireOwner(projectId, userId);
        ProjectMember target = memberRepository.findByProjectIdAndUserId(projectId, targetUserId)
                .orElseThrow(() -> ApiException.notFound("Member not found"));
        if (target.getRole() == ProjectMember.Role.owner) {
            throw ApiException.badRequest("The project owner cannot be removed");
        }
        memberRepository.delete(target);
        activity.record(me.getProject(), "MEMBER_REMOVED", target.getUser().getName() + " was removed",
                me.getUser().getName(), null);
        touch(me.getProject());
    }

    // ------------------------------------------------------------------ helpers

    private ProjectRepositoryLink linkRepository(Project project, GithubRepoRef ref, User actor) {
        ProjectRepositoryLink link = new ProjectRepositoryLink();
        link.setProject(project);
        link.setProvider("GITHUB");
        link.setUrl(ref.canonicalUrl());
        link.setRepoOwner(ref.owner());
        link.setRepoName(ref.name());
        link = repoLinkRepository.save(link);
        activity.record(project, "REPOSITORY_ADDED", "Repository " + ref.owner() + "/" + ref.name() + " linked",
                actor.getName(), link.getUrl());
        return link;
    }

    private ProjectMember addMember(Project project, User user, ProjectMember.Role role) {
        ProjectMember m = new ProjectMember();
        m.setProject(project);
        m.setUser(user);
        m.setRole(role);
        return memberRepository.save(m);
    }

    private List<User> resolveContributors(User creator, Organization org, List<Long> ids) {
        if (ids == null || ids.isEmpty()) {
            return List.of();
        }
        List<User> result = new ArrayList<>();
        for (Long id : new LinkedHashSet<>(ids)) {
            if (id == null || id.equals(creator.getId())) {
                continue;
            }
            if (!orgMembers.existsByOrganizationIdAndUserId(org.getId(), id)) {
                throw ApiException.badRequest("One of the selected people is not in this organization");
            }
            result.add(loadUser(id));
        }
        return result;
    }

    private void touch(Project project) {
        project.setUpdatedAt(Instant.now());
        projectRepository.save(project);
    }

    private User loadUser(Long id) {
        return userRepository.findById(id).orElseThrow(() -> ApiException.notFound("User not found"));
    }

    private static String blankToNull(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }

    private ProjectDetail detail(Project project, ProjectMember.Role role) {
        List<ProjectRepositoryLink> repos = repoLinkRepository.findByProjectIdOrderByAddedAtAsc(project.getId());
        List<MemberDto> members = memberRepository.findByProjectIdWithUser(project.getId()).stream()
                .map(MemberDto::from).toList();
        return new ProjectDetail(summarize(project, role, repos, members.size()),
                repos.stream().map(RepositoryDto::from).toList(), members);
    }

    private ProjectSummary summarize(Project project, ProjectMember.Role role) {
        List<ProjectRepositoryLink> repos = repoLinkRepository.findByProjectIdOrderByAddedAtAsc(project.getId());
        return summarize(project, role, repos, (int) memberRepository.countByProjectId(project.getId()));
    }

    private ProjectSummary summarize(Project project, ProjectMember.Role role,
                                     List<ProjectRepositoryLink> repos, int memberCount) {
        Instant lastSynced = repos.stream().map(ProjectRepositoryLink::getLastSyncedAt)
                .filter(Objects::nonNull).max(Comparator.naturalOrder()).orElse(null);
        Organization org = project.getOrganization();
        return new ProjectSummary(project.getId(), org.getId(), org.getName(), org.getType().name(),
                project.getName(), project.getDescription(), role.name(),
                repos.size(), memberCount, knowledgeRepository.countByProjectId(project.getId()),
                aggregateStatus(repos), lastSynced, project.getCreatedAt(), project.getUpdatedAt());
    }

    /** One badge for the whole project, derived from its repositories. */
    static String aggregateStatus(List<ProjectRepositoryLink> repos) {
        if (repos.isEmpty()) {
            return "Pending";
        }
        if (repos.stream().anyMatch(r -> r.getSyncStatus() == SyncStatus.SYNCING)) {
            return "Syncing";
        }
        if (repos.stream().anyMatch(r -> r.getSyncStatus() == SyncStatus.FAILED)) {
            return "Failed";
        }
        if (repos.stream().allMatch(r -> r.getSyncStatus() == SyncStatus.SYNCED)) {
            return "Synced";
        }
        return "Pending";
    }
}
