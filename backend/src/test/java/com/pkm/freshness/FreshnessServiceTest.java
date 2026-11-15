package com.pkm.freshness;

import com.pkm.integration.github.GitHubAppService;
import com.pkm.knowledge.KnowledgeEvidence;
import com.pkm.knowledge.KnowledgeItem;
import com.pkm.knowledge.KnowledgeItemRepository;
import com.pkm.project.Project;
import com.pkm.project.ProjectAccess;
import com.pkm.project.ProjectRepository;
import com.pkm.project.ProjectRepositoryLink;
import com.pkm.project.ProjectRepositoryLinkRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class FreshnessServiceTest {

    @Mock
    private RepositorySnapshotRepository snapshotRepository;
    @Mock
    private RepositoryChangeRepository changeRepository;
    @Mock
    private KnowledgeFreshnessRepository freshnessRepository;
    @Mock
    private KnowledgeChangeLinkRepository linkRepository;
    @Mock
    private KnowledgeItemRepository knowledgeRepository;
    @Mock
    private ProjectRepository projectRepository;
    @Mock
    private ProjectRepositoryLinkRepository repoRepository;
    @Mock
    private ProjectAccess access;
    @Mock
    private GitHubAppService github;

    private FreshnessService service;

    @BeforeEach
    void setUp() {
        service = new FreshnessService(
                snapshotRepository,
                changeRepository,
                freshnessRepository,
                linkRepository,
                knowledgeRepository,
                projectRepository,
                repoRepository,
                access,
                github
        );
    }

    @Test
    void testEvaluateKnowledgeItem_WhenSupportingFileModified_MarksPotentiallyStale() {
        Project project = new Project();
        project.setId(1L);

        ProjectRepositoryLink repo = new ProjectRepositoryLink();
        repo.setId(10L);
        repo.setProject(project);

        KnowledgeItem item = new KnowledgeItem();
        item.setId(100L);
        item.setProject(project);
        item.setRepository(repo);
        item.setTitle("Auth Filter Architecture");
        item.setUpdatedAt(Instant.now());

        KnowledgeEvidence ev = new KnowledgeEvidence();
        ev.setId(500L);
        ev.setItem(item);
        ev.setSourceType("FILE");
        ev.setSourceRef("src/main/java/com/pkm/config/JwtAuthFilter.java");
        item.setEvidence(new ArrayList<>(List.of(ev)));

        RepositoryChange change = new RepositoryChange();
        change.setId(1L);
        change.setRepository(repo);
        change.setProject(project);
        change.setFilePath("src/main/java/com/pkm/config/JwtAuthFilter.java");
        change.setChangeType("MODIFIED");
        change.setToCommit("abc1234");

        when(freshnessRepository.findByKnowledgeItemId(100L)).thenReturn(Optional.empty());
        when(freshnessRepository.save(any(KnowledgeFreshness.class))).thenAnswer(inv -> inv.getArgument(0));

        service.evaluateKnowledgeItem(item, List.of(change), "abc1234");

        verify(freshnessRepository).save(argThat(f ->
                "POTENTIALLY_STALE".equals(f.getChangeStatus()) &&
                "FRESH".equals(f.getAgeStatus()) &&
                f.getChangedFiles().contains("JwtAuthFilter.java")
        ));
    }

    @Test
    void testEvaluateKnowledgeItem_WhenSupportingFileDeleted_MarksOutdated() {
        Project project = new Project();
        project.setId(1L);

        ProjectRepositoryLink repo = new ProjectRepositoryLink();
        repo.setId(10L);
        repo.setProject(project);

        KnowledgeItem item = new KnowledgeItem();
        item.setId(101L);
        item.setProject(project);
        item.setRepository(repo);
        item.setTitle("Legacy Report Exporter");
        item.setUpdatedAt(Instant.now().minus(40, ChronoUnit.DAYS));

        KnowledgeEvidence ev = new KnowledgeEvidence();
        ev.setId(501L);
        ev.setItem(item);
        ev.setSourceType("FILE");
        ev.setSourceRef("src/LegacyExporter.java");
        item.setEvidence(new ArrayList<>(List.of(ev)));

        RepositoryChange change = new RepositoryChange();
        change.setId(2L);
        change.setRepository(repo);
        change.setProject(project);
        change.setFilePath("src/LegacyExporter.java");
        change.setChangeType("REMOVED");
        change.setToCommit("def5678");

        when(freshnessRepository.findByKnowledgeItemId(101L)).thenReturn(Optional.empty());
        when(freshnessRepository.save(any(KnowledgeFreshness.class))).thenAnswer(inv -> inv.getArgument(0));

        service.evaluateKnowledgeItem(item, List.of(change), "def5678");

        verify(freshnessRepository).save(argThat(f ->
                "OUTDATED".equals(f.getChangeStatus()) &&
                "STALE".equals(f.getAgeStatus())
        ));
    }

    @Test
    void testEvaluateKnowledgeItem_WhenNoChanges_MarksCurrent() {
        Project project = new Project();
        project.setId(1L);

        ProjectRepositoryLink repo = new ProjectRepositoryLink();
        repo.setId(10L);
        repo.setProject(project);

        KnowledgeItem item = new KnowledgeItem();
        item.setId(102L);
        item.setProject(project);
        item.setRepository(repo);
        item.setTitle("User Service");
        item.setUpdatedAt(Instant.now());

        KnowledgeEvidence ev = new KnowledgeEvidence();
        ev.setId(502L);
        ev.setItem(item);
        ev.setSourceType("FILE");
        ev.setSourceRef("src/main/java/com/pkm/user/UserService.java");
        item.setEvidence(new ArrayList<>(List.of(ev)));

        RepositoryChange change = new RepositoryChange();
        change.setId(3L);
        change.setRepository(repo);
        change.setProject(project);
        change.setFilePath("frontend/src/App.tsx");
        change.setChangeType("MODIFIED");
        change.setToCommit("xyz9876");

        when(freshnessRepository.findByKnowledgeItemId(102L)).thenReturn(Optional.empty());
        when(freshnessRepository.save(any(KnowledgeFreshness.class))).thenAnswer(inv -> inv.getArgument(0));

        service.evaluateKnowledgeItem(item, List.of(change), "xyz9876");

        verify(freshnessRepository).save(argThat(f ->
                "CURRENT".equals(f.getChangeStatus()) &&
                "FRESH".equals(f.getAgeStatus())
        ));
    }

    @Test
    void testEvaluateKnowledgeItem_WhenNoFileEvidence_MarksUnknown() {
        Project project = new Project();
        project.setId(1L);

        KnowledgeItem item = new KnowledgeItem();
        item.setId(103L);
        item.setProject(project);
        item.setTitle("General Concept");
        item.setUpdatedAt(Instant.now());
        item.setEvidence(new ArrayList<>());

        when(freshnessRepository.findByKnowledgeItemId(103L)).thenReturn(Optional.empty());
        when(freshnessRepository.save(any(KnowledgeFreshness.class))).thenAnswer(inv -> inv.getArgument(0));

        service.evaluateKnowledgeItem(item, List.of(), "abc123");

        verify(freshnessRepository).save(argThat(f -> "UNKNOWN".equals(f.getChangeStatus())));
    }
}
