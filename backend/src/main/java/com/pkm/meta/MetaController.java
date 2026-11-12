package com.pkm.meta;

import com.pkm.integration.github.GitHubAppService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/meta")
public class MetaController {

    public record Meta(boolean githubAppConfigured, String version) {
    }

    private final GitHubAppService github;

    public MetaController(GitHubAppService github) {
        this.github = github;
    }

    @GetMapping
    public Meta meta() {
        return new Meta(github.isConfigured(), "1.0.0");
    }
}
