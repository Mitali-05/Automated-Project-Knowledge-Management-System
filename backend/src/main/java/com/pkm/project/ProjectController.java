package com.pkm.project;

import com.pkm.project.dto.CreateProjectRequest;
import com.pkm.project.dto.ProjectResponse;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/projects")
public class ProjectController {

    private final ProjectService projectService;

    public ProjectController(ProjectService projectService) {
        this.projectService = projectService;
    }

    // JwtAuthFilter sets the authenticated principal to the userId (Long) — see config/JwtAuthFilter.java
    private Long currentUserId(Authentication auth) {
        return (Long) auth.getPrincipal();
    }

    @PostMapping
    public ResponseEntity<ProjectResponse> create(
            Authentication auth, @Valid @RequestBody CreateProjectRequest request) {
        return ResponseEntity.ok(projectService.createProject(currentUserId(auth), request));
    }

    @GetMapping
    public ResponseEntity<List<ProjectResponse>> list(Authentication auth) {
        return ResponseEntity.ok(projectService.listProjectsForUser(currentUserId(auth)));
    }
}
