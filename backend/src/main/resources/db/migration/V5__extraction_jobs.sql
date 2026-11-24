-- Persist extraction progress and history. Schema changes are owned by Flyway.
CREATE TABLE extraction_jobs (
    id BIGSERIAL PRIMARY KEY,
    project_id BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    repository_id BIGINT REFERENCES project_repositories(id) ON DELETE CASCADE,
    status VARCHAR(30) NOT NULL,
    progress INTEGER NOT NULL DEFAULT 0,
    status_message VARCHAR(500),
    logs TEXT,
    triggered_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ,
    duration_seconds INTEGER,
    trust_score DOUBLE PRECISION,
    items_extracted INTEGER DEFAULT 0,
    error_message TEXT
);

CREATE INDEX idx_extraction_jobs_project_started
    ON extraction_jobs(project_id, started_at DESC);
CREATE INDEX idx_extraction_jobs_repository_started
    ON extraction_jobs(repository_id, started_at DESC);
