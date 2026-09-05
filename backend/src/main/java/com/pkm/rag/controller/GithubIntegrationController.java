package com.pkm.rag.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.pkm.org.Organization;
import com.pkm.org.OrganizationRepository;
import com.pkm.rag.service.GitHubAppService;
import com.pkm.user.User;
import com.pkm.user.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/integrations/github")
public class GithubIntegrationController {

    private final UserRepository userRepository;
    private final OrganizationRepository organizationRepository;
    private final GitHubAppService githubAppService;

    @Value("${app.github.app-id:}")
    private String appId;

    @Value("${app.github.app-slug:}")
    private String appSlug;

    public GithubIntegrationController(UserRepository userRepository, OrganizationRepository organizationRepository, GitHubAppService githubAppService) {
        this.userRepository = userRepository;
        this.organizationRepository = organizationRepository;
        this.githubAppService = githubAppService;
    }

    @GetMapping("/url")
    public ResponseEntity<Map<String, Object>> getInstallationUrl() {
        boolean configured = appId != null && !appId.isBlank() && appSlug != null && !appSlug.isBlank();
        
        if (configured) {
            return ResponseEntity.ok(Map.of(
                "configured", true,
                "appId", appId, 
                "appSlug", appSlug,
                "installUrl", "https://github.com/apps/" + appSlug + "/installations/new"
            ));
        } else {
            // Return the manifest creation URL so UI can redirect there
            return ResponseEntity.ok(Map.of(
                "configured", false,
                "message", "GitHub App not configured. Admin must create the app first.",
                "setupUrl", "https://github.com/settings/apps/new"
            ));
        }
    }

    @PostMapping("/callback")
    public ResponseEntity<?> handleCallback(@RequestBody Map<String, String> payload) {
        String installationId = payload.get("installation_id");
        if (installationId == null || installationId.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "installation_id is required"));
        }

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || auth.getName() == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));
        }
        
        String userIdStr = auth.getName();
        
        User user = null;
        try {
            Long userId = Long.parseLong(userIdStr);
            user = userRepository.findById(userId).orElse(null);
        } catch (NumberFormatException e) {
            return ResponseEntity.status(401).body(Map.of("error", "Invalid user ID"));
        }
        
        if (user == null) {
            return ResponseEntity.status(401).body(Map.of("error", "User not found"));
        }

        Organization org = user.getOrganization();
        org.setGithubInstallationId(installationId);
        organizationRepository.save(org);

        return ResponseEntity.ok(Map.of("success", true, "message", "GitHub App installed successfully"));
    }

    @GetMapping("/repositories")
    public ResponseEntity<?> getRepositories() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || auth.getName() == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));
        }

        String userIdStr = auth.getName();
        
        User user = null;
        try {
            Long userId = Long.parseLong(userIdStr);
            user = userRepository.findById(userId).orElse(null);
        } catch (NumberFormatException e) {
            return ResponseEntity.status(401).body(Map.of("error", "Invalid user ID"));
        }
        
        if (user == null) {
            return ResponseEntity.status(401).body(Map.of("error", "User not found"));
        }

        Organization org = user.getOrganization();
        String installationId = org.getGithubInstallationId();

        if (installationId == null || installationId.isBlank()) {
            return ResponseEntity.ok(Map.of("authorized", false));
        }

        java.util.List<Map<String, Object>> repos = githubAppService.getRepositoriesForInstallation(installationId);
        return ResponseEntity.ok(Map.of("authorized", true, "repositories", repos));
    }
}
