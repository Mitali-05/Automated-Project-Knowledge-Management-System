package com.pkm.integration.github;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.pkm.common.ApiException;
import com.pkm.config.JwtUtil;
import com.pkm.org.*;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class GithubConnectionSecurityTest {
    final JdbcTemplate db=mock(JdbcTemplate.class);
    final OrgAccess access=mock(OrgAccess.class);
    final OrganizationRepository orgs=mock(OrganizationRepository.class);
    final JwtUtil jwt=mock(JwtUtil.class);
    final GitHubAppService github=mock(GitHubAppService.class);
    GithubConnectionService service(){return new GithubConnectionService(db,access,orgs,jwt,github,new ObjectMapper());}
    @Test void invalidUserBoundStateCannotReachGitHub() {
        when(jwt.parseGithubState("bad",1L)).thenReturn(Optional.empty());
        assertThrows(ApiException.class,()->service().authorize(1,"code","bad"));
        verifyNoInteractions(db,access,github,orgs);
    }
    @Test void expiredOrReplayedSelectionCannotLinkInstallation() {
        assertThrows(ApiException.class,()->service().select(1,UUID.randomUUID().toString(),"7"));
        verifyNoInteractions(access,github,orgs);
    }
    @Test void browserCannotSubstituteAnUnauthorizedInstallationId() {
        UUID id=UUID.randomUUID();
        var member=mock(OrganizationMember.class);
        when(access.requireAdmin(10L,1L)).thenReturn(member);
        when(member.getOrganization()).thenReturn(new Organization());
        when(db.queryForList("DELETE FROM github_connection_selections WHERE id=? AND user_id=? AND expires_at>now() RETURNING org_id,installations",id,1L))
            .thenReturn(List.of(Map.of("org_id",10L,"installations","[{\"id\":\"7\",\"account\":\"qa\"}]")));
        assertThrows(ApiException.class,()->service().select(1,id.toString(),"999"));
        verifyNoInteractions(github,orgs);
    }
}
