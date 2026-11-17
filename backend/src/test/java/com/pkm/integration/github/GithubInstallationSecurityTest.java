package com.pkm.integration.github;

import com.pkm.common.ApiException;
import com.pkm.config.JwtUtil;
import com.pkm.org.*;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class GithubInstallationSecurityTest {
    @Test
    void unverifiedInstallationIsRejectedEvenWhenVerificationIsNotConfigured() {
        var repository = mock(OrganizationRepository.class);
        var access = mock(OrgAccess.class);
        var github = mock(GitHubAppService.class);
        var jwt = mock(JwtUtil.class);
        var member = mock(OrganizationMember.class);
        var org = new Organization();
        org.setId(10L);
        when(jwt.parseGithubState("state", 1L)).thenReturn(Optional.of(10L));
        when(access.requireAdmin(10L, 1L)).thenReturn(member);
        when(member.getOrganization()).thenReturn(org);
        when(repository.findByGithubInstallationId("123")).thenReturn(Optional.empty());
        when(github.canVerifyOwnership()).thenReturn(false);
        when(github.userOwnsInstallation("code", "123")).thenReturn(false);
        var service = new GithubIntegrationService(repository, access, github, jwt);
        assertThrows(ApiException.class, () -> service.completeInstall(1L, "123", "state", "code"));
        verify(repository, never()).save(any());
        assertNull(org.getGithubInstallationId());
    }

    @Test
    void invalidStateCannotReachInstallationVerification() {
        var repository = mock(OrganizationRepository.class);
        var access = mock(OrgAccess.class);
        var github = mock(GitHubAppService.class);
        var jwt = mock(JwtUtil.class);
        when(jwt.parseGithubState("bad-state", 1L)).thenReturn(Optional.empty());
        var service = new GithubIntegrationService(repository, access, github, jwt);
        assertThrows(ApiException.class, () -> service.completeInstall(1L, "123", "bad-state", "code"));
        verifyNoInteractions(github, repository, access);
    }
}
