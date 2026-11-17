package com.pkm.project;

import com.pkm.common.CurrentUser;
import com.pkm.project.dto.*;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/projects")
public class ProjectController {

    private final ProjectService service;

    public ProjectController(ProjectService service) {
        this.service = service;
    }

    @GetMapping
    public List<ProjectSummary> list() {
        return service.list(CurrentUser.id());
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ProjectDetail create(@Valid @RequestBody CreateProjectRequest request) {
        return service.create(CurrentUser.id(), request);
    }

    @GetMapping("/{projectId}")
    public ProjectDetail get(@PathVariable Long projectId) {
        return service.get(projectId, CurrentUser.id());
    }

    @PutMapping("/{projectId}")
    public ProjectDetail update(@PathVariable Long projectId, @Valid @RequestBody UpdateProjectRequest request) {
        return service.update(projectId, CurrentUser.id(), request);
    }

    @DeleteMapping("/{projectId}")
    public ResponseEntity<Void> delete(@PathVariable Long projectId) {
        service.delete(projectId, CurrentUser.id());
        return ResponseEntity.noContent().build();
    }

    // ---- repositories
    @PostMapping("/{projectId}/repositories")
    @ResponseStatus(HttpStatus.CREATED)
    public RepositoryDto addRepository(@PathVariable Long projectId, @Valid @RequestBody AddRepositoryRequest request) {
        return service.addRepository(projectId, CurrentUser.id(), request.url());
    }

    @DeleteMapping("/{projectId}/repositories/{repositoryId}")
    public ResponseEntity<Void> removeRepository(@PathVariable Long projectId, @PathVariable Long repositoryId) {
        service.removeRepository(projectId, repositoryId, CurrentUser.id());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{projectId}/sync")
    public Map<String, Integer> sync(@PathVariable Long projectId) {
        return Map.of("queued", service.requestSync(projectId, CurrentUser.id()));
    }

    @GetMapping("/{projectId}/sync/status")
    public SyncStatusDto syncStatus(@PathVariable Long projectId) {
        return service.getSyncStatus(projectId, CurrentUser.id());
    }

    @GetMapping("/{projectId}/sync/history")
    public List<SyncHistoryDto> syncHistory(@PathVariable Long projectId) {
        return service.getSyncHistory(projectId, CurrentUser.id());
    }

    // ---- members
    @PostMapping("/{projectId}/members")
    @ResponseStatus(HttpStatus.CREATED)
    public MemberDto addMember(@PathVariable Long projectId, @Valid @RequestBody AddMemberRequest request) {
        return service.addMember(projectId, CurrentUser.id(), request.userId());
    }

    @DeleteMapping("/{projectId}/members/{userId}")
    public ResponseEntity<Void> removeMember(@PathVariable Long projectId, @PathVariable Long userId) {
        service.removeMember(projectId, CurrentUser.id(), userId);
        return ResponseEntity.noContent().build();
    }
}
