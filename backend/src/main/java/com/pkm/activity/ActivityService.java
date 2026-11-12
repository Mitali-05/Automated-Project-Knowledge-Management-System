package com.pkm.activity;

import com.pkm.common.PageResponse;
import com.pkm.project.Project;
import com.pkm.project.ProjectAccess;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;

@Service
public class ActivityService {

    /** Upper bound of events loaded for one project history page request. */
    private static final int HISTORY_WINDOW = 1000;

    private final ProjectActivityRepository repository;
    private final ProjectAccess access;

    public ActivityService(ProjectActivityRepository repository, ProjectAccess access) {
        this.repository = repository;
        this.access = access;
    }

    /** Records a platform event inside the caller's transaction. */
    @Transactional
    public void record(Project project, String type, String title, String actor, String repositoryUrl) {
        record(project, type, title, actor, repositoryUrl, null, null, Instant.now());
    }

    @Transactional
    public void record(Project project, String type, String title, String actor, String repositoryUrl,
                       String sourceRef, String url, Instant occurredAt) {
        ProjectActivity a = new ProjectActivity();
        a.setProject(project);
        a.setEventType(type);
        a.setTitle(title);
        a.setActorName(actor);
        a.setRepositoryUrl(repositoryUrl);
        a.setSourceRef(sourceRef);
        a.setUrl(url);
        a.setOccurredAt(occurredAt == null ? Instant.now() : occurredAt);
        repository.save(a);
    }

    @Transactional(readOnly = true)
    public PageResponse<ActivityDto> history(Long projectId, Long userId, int page, int size) {
        access.requireMember(projectId, userId);
        List<ActivityDto> all = repository
                .findByProjectIdOrderByOccurredAtDesc(projectId, PageRequest.of(0, HISTORY_WINDOW))
                .stream().map(ActivityDto::from).toList();
        return PageResponse.of(all, page, size);
    }
}
