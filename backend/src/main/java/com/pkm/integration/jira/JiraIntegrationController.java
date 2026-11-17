package com.pkm.integration.jira;

import com.pkm.common.CurrentUser;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestController
@RequestMapping("/api/integrations/jira")
public class JiraIntegrationController {
    public record Begin(@Positive long projectId) {}
    public record Callback(@NotBlank String code, @NotBlank String state) {}
    public record Selection(@Positive long projectId, @NotBlank String cloudId, @NotBlank String jiraProjectId) {}
    private final JiraIntegrationService service;
    private final JiraSyncService sync;
    public JiraIntegrationController(JiraIntegrationService service, JiraSyncService sync) { this.service = service; this.sync=sync; }
    @GetMapping("/issues")
    public Map<String,Object> issues(@RequestParam long projectId) { return sync.state(CurrentUser.id(),projectId); }
    @PostMapping("/sync")
    public Map<String,Boolean> sync(@Valid @RequestBody Begin request) { sync.start(CurrentUser.id(),request.projectId()); return Map.of("queued",true); }

    @GetMapping("/status")
    public JiraIntegrationService.Status status(@RequestParam long projectId) { return service.status(CurrentUser.id(), projectId); }

    @PostMapping("/authorize")
    public Map<String, String> authorize(@Valid @RequestBody Begin request) {
        return Map.of("url", service.begin(CurrentUser.id(), request.projectId()));
    }

    @PostMapping("/callback")
    public Map<String, Long> callback(@Valid @RequestBody Callback request) {
        return Map.of("projectId", service.complete(CurrentUser.id(), request.code(), request.state()));
    }

    @GetMapping("/projects")
    public JiraIntegrationService.ProjectPage projects(@RequestParam long projectId, @RequestParam String cloudId,
                                                       @RequestParam(defaultValue = "0") int startAt) {
        return service.projects(CurrentUser.id(), projectId, cloudId, startAt);
    }

    @PostMapping("/selection")
    public Map<String, Boolean> select(@Valid @RequestBody Selection request) {
        service.select(CurrentUser.id(), request.projectId(), request.cloudId(), request.jiraProjectId());
        return Map.of("connected", true);
    }

    @DeleteMapping("/connection")
    public Map<String, Boolean> disconnect(@RequestParam long projectId) {
        service.disconnect(CurrentUser.id(), projectId);
        return Map.of("disconnected", true);
    }
}
