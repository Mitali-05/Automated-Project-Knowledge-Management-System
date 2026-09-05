package com.pkm.project;

import com.pkm.project.dto.CreateProjectRequest;
import com.pkm.project.dto.ProjectResponse;
import com.pkm.user.User;
import com.pkm.user.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.pkm.rag.entity.ProjectRepositoryEntity;
import com.pkm.rag.entity.ProjectRepositoryRepo;
import com.pkm.rag.service.GitHubExtractionService;

import java.util.List;

@Service
public class ProjectService {

    private final ProjectRepository projectRepository;
    private final ProjectMemberRepository projectMemberRepository;
    private final UserRepository userRepository;
    private final ProjectRepositoryRepo repoRepository;
    private final GitHubExtractionService githubService;

    public ProjectService(
            ProjectRepository projectRepository,
            ProjectMemberRepository projectMemberRepository,
            UserRepository userRepository,
            ProjectRepositoryRepo repoRepository,
            GitHubExtractionService githubService) {
        this.projectRepository = projectRepository;
        this.projectMemberRepository = projectMemberRepository;
        this.userRepository = userRepository;
        this.repoRepository = repoRepository;
        this.githubService = githubService;
    }

    @Transactional
    public ProjectResponse createProject(Long userId, CreateProjectRequest req) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED));

        Project project = new Project();
        project.setOrganization(user.getOrganization());
        project.setName(req.name());
        project.setDescription(req.description());
        project.setCreatedBy(user);
        project = projectRepository.save(project);

        ProjectMember membership = new ProjectMember();
        membership.setProject(project);
        membership.setUser(user);
        membership.setRole(ProjectMember.Role.owner);
        projectMemberRepository.save(membership);
        
        // Handle URLs for Agentic RAG
        if (req.urls() != null && !req.urls().isEmpty()) {
            for (String url : req.urls()) {
                if (url == null || url.isBlank()) continue;
                ProjectRepositoryEntity repoEntity = new ProjectRepositoryEntity();
                repoEntity.setProject(project);
                repoEntity.setUrl(url);
                repoEntity.setProvider(url.contains("github.com") ? "GITHUB" : "OTHER");
                repoEntity = repoRepository.save(repoEntity);
                
                if ("GITHUB".equals(repoEntity.getProvider())) {
                    // Trigger extraction synchronously for testing
                    githubService.extractAndSaveKnowledge(project, repoEntity);
                }
            }
        }

        return new ProjectResponse(project.getId(), project.getName(), project.getDescription(),
                "owner", project.getCreatedAt());
    }

    public List<ProjectResponse> listProjectsForUser(Long userId) {
        return projectMemberRepository.findByUserId(userId).stream()
                .map(m -> new ProjectResponse(
                        m.getProject().getId(),
                        m.getProject().getName(),
                        m.getProject().getDescription(),
                        m.getRole().name(),
                        m.getProject().getCreatedAt()))
                .toList();
    }

    public ProjectResponse getProject(Long userId, Long projectId) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Project not found"));

        ProjectMember membership = projectMemberRepository.findByUserId(userId).stream()
                .filter(m -> m.getProject().getId().equals(projectId))
                .findFirst()
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied"));

        return new ProjectResponse(
                project.getId(), project.getName(), project.getDescription(),
                membership.getRole().name(), project.getCreatedAt());
    }

    @Transactional
    public int triggerExtraction(Long userId, Long projectId) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Project not found"));

        // Verify user has access
        projectMemberRepository.findByUserId(userId).stream()
                .filter(m -> m.getProject().getId().equals(projectId))
                .findFirst()
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied"));

        List<ProjectRepositoryEntity> repos = repoRepository.findByProjectId(projectId);
        int totalExtracted = 0;

        for (ProjectRepositoryEntity repoEntity : repos) {
            try {
                githubService.extractAndSaveKnowledge(project, repoEntity);
                totalExtracted++;
            } catch (Exception e) {
                // Log but continue with other repos
                System.err.println("Extraction failed for repo " + repoEntity.getUrl() + ": " + e.getMessage());
            }
        }

        return totalExtracted;
    }

    @Transactional
    public void addRepository(Long userId, Long projectId, String url) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Project not found"));

        // Verify user has access
        projectMemberRepository.findByUserId(userId).stream()
                .filter(m -> m.getProject().getId().equals(projectId))
                .findFirst()
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied"));

        ProjectRepositoryEntity repoEntity = new ProjectRepositoryEntity();
        repoEntity.setProject(project);
        repoEntity.setUrl(url);
        repoEntity.setProvider(url.contains("github.com") ? "GITHUB" : "OTHER");
        repoRepository.save(repoEntity);
    }

    @Transactional
    public ProjectResponse updateProject(Long userId, Long projectId, CreateProjectRequest req) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Project not found"));

        ProjectMember membership = projectMemberRepository.findByUserId(userId).stream()
                .filter(m -> m.getProject().getId().equals(projectId))
                .findFirst()
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied"));

        if (req.name() != null && !req.name().isBlank()) {
            project.setName(req.name());
        }
        if (req.description() != null) {
            project.setDescription(req.description());
        }
        project = projectRepository.save(project);

        return new ProjectResponse(
                project.getId(), project.getName(), project.getDescription(),
                membership.getRole().name(), project.getCreatedAt());
    }

    @Transactional
    public void deleteProject(Long userId, Long projectId) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Project not found"));

        ProjectMember membership = projectMemberRepository.findByUserId(userId).stream()
                .filter(m -> m.getProject().getId().equals(projectId))
                .findFirst()
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied"));

        if (!ProjectMember.Role.owner.equals(membership.getRole())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only owners can delete the project");
        }

        projectRepository.delete(project);
    }
}
