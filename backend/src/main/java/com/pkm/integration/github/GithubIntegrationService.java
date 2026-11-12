package com.pkm.integration.github;

import com.pkm.common.ApiException;
import com.pkm.config.JwtUtil;
import com.pkm.org.OrgAccess;
import com.pkm.org.Organization;
import com.pkm.org.OrganizationMember;
import com.pkm.org.OrganizationRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.regex.Pattern;

/** The GitHub App connection belongs to an organization; any member can use it, owners/admins manage it. */
@Service
public class GithubIntegrationService {

    private static final Pattern NUMERIC = Pattern.compile("^\\d{1,20}$");

    public record Status(boolean configured, boolean connected, boolean canManage, String installUrl) {
    }

    public record RepoOption(long id, String fullName, String url, boolean isPrivate, String description) {
    }

    private final OrganizationRepository organizationRepository;
    private final OrgAccess orgAccess;
    private final GitHubAppService github;
    private final JwtUtil jwtUtil;

    public GithubIntegrationService(OrganizationRepository organizationRepository, OrgAccess orgAccess,
                                    GitHubAppService github, JwtUtil jwtUtil) {
        this.organizationRepository = organizationRepository;
        this.orgAccess = orgAccess;
        this.github = github;
        this.jwtUtil = jwtUtil;
    }

    @Transactional(readOnly = true)
    public Status status(Long userId, Long orgId) {
        OrganizationMember me = orgAccess.requireMember(orgId, userId);
        boolean connected = hasText(me.getOrganization().getGithubInstallationId());
        boolean canManage = me.getRole() != OrganizationMember.Role.member;
        String url = github.isConfigured() && canManage
                ? github.installUrl(jwtUtil.generateGithubState(userId, orgId)) : null;
        return new Status(github.isConfigured(), connected, canManage, url);
    }

    /**
     * Stores the installation for the organization named in the signed {@code state}. The state proves the
     * callback belongs to a flow this user started (and for which organization); the optional OAuth {@code code}
     * proves they control the installation. Returns the organization id so the UI can go back to it.
     */
    @Transactional
    public Long completeInstall(Long userId, String installationId, String state, String oauthCode) {
        if (installationId == null || !NUMERIC.matcher(installationId).matches()) {
            throw ApiException.badRequest("Invalid GitHub installation id");
        }
        Long orgId = jwtUtil.parseGithubState(state, userId).orElseThrow(() -> ApiException.badRequest(
                "This GitHub connection request expired or is invalid. Start again from PRISM."));
        Organization org = orgAccess.requireAdmin(orgId, userId).getOrganization();

        organizationRepository.findByGithubInstallationId(installationId)
                .filter(other -> !other.getId().equals(org.getId()))
                .ifPresent(other -> {
                    throw ApiException.conflict("This GitHub installation is already connected to another organization");
                });

        boolean verified = github.userOwnsInstallation(oauthCode, installationId);
        if (github.canVerifyOwnership() && !verified) {
            throw ApiException.forbidden("GitHub could not confirm that you have access to this installation");
        }
        org.setGithubInstallationId(installationId);
        org.setGithubInstallationVerified(verified);
        organizationRepository.save(org);
        return org.getId();
    }

    @Transactional(readOnly = true)
    public List<RepoOption> repositories(Long userId, Long orgId) {
        String installationId = orgAccess.requireMember(orgId, userId).getOrganization().getGithubInstallationId();
        if (!hasText(installationId)) {
            throw ApiException.badRequest("Connect GitHub for this organization first");
        }
        return github.repositories(installationId).stream()
                .map(r -> new RepoOption(r.id(), r.fullName(), r.url(), r.isPrivate(), r.description()))
                .toList();
    }

    private static boolean hasText(String s) {
        return s != null && !s.isBlank();
    }
}
