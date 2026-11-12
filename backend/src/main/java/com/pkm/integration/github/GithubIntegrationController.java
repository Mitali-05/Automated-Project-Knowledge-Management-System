package com.pkm.integration.github;

import com.pkm.common.CurrentUser;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/integrations/github")
public class GithubIntegrationController {

    public record CallbackRequest(@NotBlank(message = "installationId is required") String installationId,
                                  @NotBlank(message = "state is required") String state,
                                  String code) {
    }

    public record CallbackResponse(Long orgId) {
    }

    private final GithubIntegrationService service;

    public GithubIntegrationController(GithubIntegrationService service) {
        this.service = service;
    }

    @GetMapping("/status")
    public GithubIntegrationService.Status status(@RequestParam Long orgId) {
        return service.status(CurrentUser.id(), orgId);
    }

    @PostMapping("/callback")
    public CallbackResponse callback(@Valid @RequestBody CallbackRequest request) {
        Long orgId = service.completeInstall(CurrentUser.id(), request.installationId(), request.state(), request.code());
        return new CallbackResponse(orgId);
    }

    @GetMapping("/repositories")
    public List<GithubIntegrationService.RepoOption> repositories(@RequestParam Long orgId) {
        return service.repositories(CurrentUser.id(), orgId);
    }
}
