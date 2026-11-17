package com.pkm.integration.github;
import com.pkm.common.CurrentUser;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestController
@RequestMapping("/api/integrations/github/connection")
public class GithubConnectionController {
    public record Authorization(@NotBlank String code,@NotBlank String state) {}
    public record Selection(@NotBlank String connectionId,@NotBlank String installationId) {}
    private final GithubConnectionService service;
    public GithubConnectionController(GithubConnectionService service){this.service=service;}
    @PostMapping("/authorize")
    public GithubConnectionService.Options authorize(@Valid @RequestBody Authorization request) {
        return service.authorize(CurrentUser.id(),request.code(),request.state());
    }
    @PostMapping("/select")
    public Map<String,Long> select(@Valid @RequestBody Selection request) {
        return Map.of("orgId",service.select(CurrentUser.id(),request.connectionId(),request.installationId()));
    }
}
