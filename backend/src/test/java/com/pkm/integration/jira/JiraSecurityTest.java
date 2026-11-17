package com.pkm.integration.jira;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.pkm.common.ApiException;
import com.pkm.org.OrgAccess;
import com.pkm.project.ProjectAccess;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.SimpleTransactionStatus;
import java.util.Base64;
import java.util.List;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class JiraSecurityTest {
    private final JdbcTemplate db = mock(JdbcTemplate.class);
    private final ProjectAccess access = mock(ProjectAccess.class);
    private final OrgAccess org = mock(OrgAccess.class);
    private final JiraClient client = mock(JiraClient.class);
    private final JiraTokenCipher cipher = new JiraTokenCipher(Base64.getEncoder().encodeToString(new byte[32]));
    private final PlatformTransactionManager transactions = mock(PlatformTransactionManager.class);

    private JiraIntegrationService service() {
        when(transactions.getTransaction(any(TransactionDefinition.class))).thenReturn(new SimpleTransactionStatus());
        return new JiraIntegrationService(db, access, org, client, cipher, new ObjectMapper(), transactions);
    }

    @Test void tokensAreAuthenticatedAndBoundToTheirProject() {
        String encrypted = cipher.encrypt("sensitive-token", 1);
        assertFalse(encrypted.contains("sensitive-token"));
        assertEquals("sensitive-token", cipher.decrypt(encrypted, 1));
        assertNotEquals(encrypted, cipher.encrypt("sensitive-token", 1));
        assertThrows(IllegalStateException.class, () -> cipher.decrypt(encrypted, 2));
        String altered = encrypted.substring(0, encrypted.length() - 4) + "AAAA";
        assertThrows(IllegalStateException.class, () -> cipher.decrypt(altered, 1));
    }

    @Test void missingKeyNeverUsesAnotherSecret() {
        var empty = new JiraTokenCipher("");
        assertFalse(empty.configured());
        assertThrows(IllegalStateException.class, () -> empty.encrypt("token", 1));
        assertThrows(IllegalArgumentException.class, () -> new JiraTokenCipher("YQ=="));
    }

    @Test void outsidersCannotReadConnectionMetadata() {
        when(access.requireMember(1L, 9L)).thenThrow(ApiException.notFound("Project not found"));
        assertThrows(ApiException.class, () -> service().status(9, 1));
        verifyNoInteractions(db, client);
    }

    @Test void contributorsCannotBeginConsent() {
        when(access.requireOwner(1L, 9L)).thenThrow(ApiException.forbidden("Only project owners"));
        assertThrows(ApiException.class, () -> service().begin(9, 1));
        verifyNoInteractions(db, client);
    }

    @Test void invalidOrReplayedStateCannotExchangeCode() {
        var svc = service();
        assertThrows(ApiException.class, () -> svc.complete(9, "code", "used-state"));
        verify(db).queryForList(contains("DELETE FROM jira_oauth_states"), eq(Long.class),
                eq(JiraIntegrationService.hash("used-state")), eq(9L));
        verifyNoInteractions(client, access);
    }

    @Test void callbackWithoutRefreshTokenDoesNotSaveCredentials() throws Exception {
        when(db.queryForList(contains("DELETE FROM jira_oauth_states"), eq(Long.class), anyString(), eq(9L)))
                .thenReturn(List.of(1L));
        when(db.queryForObject("SELECT org_id FROM projects WHERE id=?", Long.class, 1L)).thenReturn(2L);
        when(client.exchange("code")).thenReturn(new ObjectMapper().readTree("{\"access_token\":\"secret\",\"expires_in\":3600}"));
        assertThrows(ApiException.class, () -> service().complete(9, "code", "state"));
        verify(transactions).commit(any());
        verify(db, never()).update(startsWith("INSERT INTO jira_connections"), any(Object[].class));
        verify(client, never()).sites(anyString());
    }

    @Test void arbitrarySiteCannotBeUsedToCallJira() {
        when(db.queryForObject("SELECT org_id FROM projects WHERE id=?", Long.class, 1L)).thenReturn(2L);
        when(db.queryForList("SELECT connected_by FROM jira_connections WHERE project_id=?", Long.class, 1L)).thenReturn(List.of(9L));
        when(db.queryForList("SELECT authorized_sites FROM jira_connections WHERE project_id=?", String.class, 1L))
                .thenReturn(List.of("[{\"id\":\"allowed\",\"name\":\"Team\",\"url\":\"https://team.atlassian.net\"}]"));
        assertThrows(ApiException.class, () -> service().projects(9, 1, "other", 0));
        verifyNoInteractions(client);
    }

    @Test void anotherProjectOwnerCannotBrowseGrantOwnersOtherJiraProjects() {
        when(db.queryForObject("SELECT org_id FROM projects WHERE id=?", Long.class, 1L)).thenReturn(2L);
        when(db.queryForList("SELECT connected_by FROM jira_connections WHERE project_id=?", Long.class, 1L)).thenReturn(List.of(10L));
        assertThrows(ApiException.class, () -> service().projects(9, 1, "allowed", 0));
        verifyNoInteractions(client);
    }
}
