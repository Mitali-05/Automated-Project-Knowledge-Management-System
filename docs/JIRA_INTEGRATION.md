# Jira connection

## Implemented scope

The project Jira tab supports OAuth authorization, explicit site selection, paginated Jira project selection and persisted project mapping. Manual issue/comment synchronization, deterministic source-linked Jira knowledge and report-only refresh jobs are now implemented. Ask PRISM includes Jira items in its existing keyword retrieval. A Jira vector index, commit-development API import, Jira write actions and webhooks are not implemented. Follow JIRA_LIVE_TEST.md before signoff.

Users authorize PRISM's single Atlassian 3LO app. They do not create API keys or developer apps themselves. Current development app distribution is private; enable sharing in Atlassian before onboarding other Atlassian users.

## Server settings

Set these only in the root `.env` or deployment secret manager:

| Variable | Meaning |
| --- | --- |
| `JIRA_CLIENT_ID` | OAuth client ID from Atlassian Settings; not the app UUID |
| `JIRA_CLIENT_SECRET` | OAuth client secret |
| `JIRA_REDIRECT_URI` | Exact callback URL saved in Atlassian Authorization |
| `JIRA_TOKEN_ENCRYPTION_KEY` | Base64 of 32 cryptographically random bytes |

Local callback: `http://localhost:5173/app/jira/callback`. Keep the encryption key stable and back it up securely with deployment secrets. Losing or changing it requires reconnecting stored Jira authorizations. No secret belongs in Vite variables.

Enable the Jira platform classic scope `read:jira-work`. The server also requests `offline_access` to obtain rotating refresh tokens. Do not add write/admin scopes for this read-only phase.

## Persistence and authorization

Flyway V6 creates `jira_oauth_states` and `jira_connections` without changing existing user or project data. Connection metadata and encrypted tokens live in PostgreSQL. AES-256-GCM uses a new nonce for each encryption, authenticated with the PRISM project ID. Tokens are never returned by the API. Error responses do not include Atlassian response bodies.

An initiator must be both a project owner and a workspace owner/admin. State is a random 256-bit value, stored as a SHA-256 hash, tied to the initiating user and project, valid for ten minutes and atomically consumed before exchanging the code. A replay cannot exchange a second code. Other project owners can disconnect the shared project connection, but only its authorizing user can browse its available Jira projects or change its selection.

An explicitly selected site's ID must match the authorized resources returned by Atlassian. Project metadata is fetched from Atlassian; client-supplied project keys or names are never trusted. The UI states that future imported data will be shared with PRISM project members. The app does not enforce per-viewer Jira permissions on imported data; do not extend this into issue ingestion without deciding that access policy.

Refreshes lock the connection row, replace both tokens, and commit before any subsequent Jira request. This prevents a failed project-list request from rolling back an already rotated refresh token. Network loss after Atlassian rotates but before PRISM receives the response can still require reauthorization; there is no blind retry with an old refresh token. Disconnect removes local credentials and pending states; it does not revoke Atlassian account consent. Revoke that separately in Atlassian connected apps.

## Local validation

1. Restart the backend from `backend` with `.\mvnw.cmd spring-boot:run`; confirm Flyway V6 applies.
2. Open a PRISM project as an authorized owner, then Jira → Connect Jira.
3. Confirm Atlassian shows PRISM, the intended site, and read consent. Approve it personally.
4. Select the authorized site, then the desired Jira project (for example `SCRUM` if returned by Jira). Save the mapping.
5. Reload the tab: selected metadata must survive. Another unrelated PRISM user must receive 404 when requesting this project status.
6. Replaying an already used callback must fail. Denying consent must display an error. Disconnect must remove the local connection.
7. Verify an expired access token triggers exactly one successful rotating refresh under concurrent requests in a database integration environment.

Automated tests cover encryption/tamper detection, cross-project token substitution, missing encryption configuration, outsider and contributor access, invalid/replayed-state rejection, missing refresh token, unapproved site selection, grant-owner restrictions, exchange payload and credential-safe upstream errors. These tests use mocks; they do not establish a successful real Atlassian consent or PostgreSQL concurrency run.

Official reference: https://developer.atlassian.com/cloud/jira/platform/oauth-2-3lo-apps/
