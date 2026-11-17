ALTER TABLE jira_connections ADD COLUMN sync_status VARCHAR(20) NOT NULL DEFAULT 'NEVER';
ALTER TABLE jira_connections ADD COLUMN sync_started_at TIMESTAMPTZ;
ALTER TABLE jira_connections ADD COLUMN synced_at TIMESTAMPTZ;
ALTER TABLE jira_connections ADD COLUMN sync_error TEXT;
ALTER TABLE jira_connections ADD COLUMN sync_run_id UUID;
CREATE TABLE jira_issues (
 project_id BIGINT NOT NULL REFERENCES jira_connections(project_id) ON DELETE CASCADE,
 issue_id TEXT NOT NULL, issue_key TEXT NOT NULL, summary TEXT NOT NULL,
 status TEXT NOT NULL, issue_type TEXT NOT NULL, priority TEXT NOT NULL,
 description TEXT NOT NULL, acceptance_criteria TEXT NOT NULL, comments TEXT NOT NULL,
 source_url TEXT NOT NULL, source_updated_at TEXT NOT NULL,
 PRIMARY KEY(project_id, issue_id)
);
CREATE TABLE jira_report_jobs (
 repository_id BIGINT PRIMARY KEY REFERENCES project_repositories(id) ON DELETE CASCADE,
 id UUID NOT NULL UNIQUE, status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
 started_at TIMESTAMPTZ, error TEXT
);
