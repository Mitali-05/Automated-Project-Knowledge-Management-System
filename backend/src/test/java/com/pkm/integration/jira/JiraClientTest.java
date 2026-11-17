package com.pkm.integration.jira;

import com.pkm.common.ApiException;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.*;
import static org.springframework.test.web.client.response.MockRestResponseCreators.*;

class JiraClientTest {
    @Test void tokenExchangeUsesBackendCredentialsAndExactRedirect() {
        var builder = RestClient.builder();
        var server = MockRestServiceServer.bindTo(builder).build();
        var client = new JiraClient("id", "secret", "http://localhost:5173/app/jira/callback", builder);
        server.expect(requestTo("https://auth.atlassian.com/oauth/token"))
                .andExpect(method(HttpMethod.POST))
                .andExpect(content().json("{\"grant_type\":\"authorization_code\",\"client_id\":\"id\",\"client_secret\":\"secret\",\"code\":\"code\",\"redirect_uri\":\"http://localhost:5173/app/jira/callback\"}"))
                .andRespond(withSuccess("{\"access_token\":\"value\"}", MediaType.APPLICATION_JSON));
        assertEquals("value", client.exchange("code").path("access_token").asText());
        server.verify();
    }

    @Test void upstreamErrorNeverLeaksResponseBody() {
        var builder = RestClient.builder();
        var server = MockRestServiceServer.bindTo(builder).build();
        var client = new JiraClient("id", "secret", "callback", builder);
        server.expect(requestTo("https://auth.atlassian.com/oauth/token"))
                .andRespond(withStatus(HttpStatus.BAD_REQUEST).body("refresh_token=confidential"));
        var error = assertThrows(ApiException.class, () -> client.refresh("previous"));
        assertFalse(error.getMessage().contains("confidential"));
        assertTrue(error.getMessage().contains("Connect Jira again"));
        server.verify();
    }
}
