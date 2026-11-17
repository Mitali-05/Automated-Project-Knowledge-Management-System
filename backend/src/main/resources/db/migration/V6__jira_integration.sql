CREATE TABLE jira_oauth_states (
    state_hash VARCHAR(64) PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    project_id BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    expires_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX idx_jira_oauth_expiry ON jira_oauth_states(expires_at);

CREATE TABLE jira_connections (
    project_id BIGINT PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE,
    connected_by BIGINT NOT NULL REFERENCES users(id),
    access_token TEXT NOT NULL,
    refresh_token TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    authorized_sites TEXT NOT NULL,
    cloud_id TEXT,
    site_url TEXT,
    jira_project_id TEXT,
    jira_project_key TEXT,
    jira_project_name TEXT,
    connected_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
