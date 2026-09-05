package com.pkm.project;

import com.pkm.project.dto.CreateProjectRequest;
import com.pkm.project.dto.ProjectResponse;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

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

    @GetMapping("/{projectId}")
    public ResponseEntity<ProjectResponse> getProject(Authentication auth, @PathVariable Long projectId) {
        return ResponseEntity.ok(projectService.getProject(currentUserId(auth), projectId));
    }

    @PostMapping("/{projectId}/extract")
    public ResponseEntity<Map<String, Object>> triggerExtraction(
            Authentication auth, @PathVariable Long projectId) {
        int extracted = projectService.triggerExtraction(currentUserId(auth), projectId);
        return ResponseEntity.ok(Map.of(
            "message", "Knowledge extraction completed",
            "itemsExtracted", extracted
        ));
    }

    @PostMapping("/{projectId}/repositories")
    public ResponseEntity<Map<String, String>> addRepository(
            Authentication auth, @PathVariable Long projectId, @RequestBody Map<String, String> body) {
        String url = body.get("url");
        projectService.addRepository(currentUserId(auth), projectId, url);
        return ResponseEntity.ok(Map.of("message", "Repository added successfully"));
    }

    @PutMapping("/{projectId}")
    public ResponseEntity<ProjectResponse> updateProject(
            Authentication auth, @PathVariable Long projectId, @RequestBody CreateProjectRequest request) {
        return ResponseEntity.ok(projectService.updateProject(currentUserId(auth), projectId, request));
    }

    @DeleteMapping("/{projectId}")
    public ResponseEntity<Map<String, String>> deleteProject(
            Authentication auth, @PathVariable Long projectId) {
        projectService.deleteProject(currentUserId(auth), projectId);
        return ResponseEntity.ok(Map.of("message", "Project deleted successfully"));
    }
}
