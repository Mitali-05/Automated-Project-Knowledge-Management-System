package com.pkm.project;

import com.pkm.project.dto.CreateProjectRequest;
import com.pkm.project.dto.ProjectResponse;
import com.pkm.user.User;
import com.pkm.user.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
public class ProjectService {

    private final ProjectRepository projectRepository;
    private final ProjectMemberRepository projectMemberRepository;
    private final UserRepository userRepository;

    public ProjectService(
            ProjectRepository projectRepository,
            ProjectMemberRepository projectMemberRepository,
            UserRepository userRepository) {
        this.projectRepository = projectRepository;
        this.projectMemberRepository = projectMemberRepository;
        this.userRepository = userRepository;
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
}
