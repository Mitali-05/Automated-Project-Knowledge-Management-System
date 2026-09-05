CREATE TABLE project_repositories (
    id          BIGSERIAL PRIMARY KEY,
    project_id  BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    url         VARCHAR(512) NOT NULL,
    provider    VARCHAR(50) NOT NULL DEFAULT 'GITHUB',
    created_at  TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE knowledge_items (
    id              BIGSERIAL PRIMARY KEY,
    project_id      BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    repository_id   BIGINT REFERENCES project_repositories(id) ON DELETE CASCADE,
    title           VARCHAR(512) NOT NULL,
    knowledge_type  VARCHAR(100) NOT NULL,
    summary         TEXT NOT NULL,
    details         TEXT,
    module          VARCHAR(255),
    confidence      DOUBLE PRECISION,
    evidence_ids    TEXT, -- Storing JSON string or comma-separated for simplicity in Phase 0
    created_at      TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX idx_project_repositories_project_id ON project_repositories(project_id);
CREATE INDEX idx_knowledge_items_project_id ON knowledge_items(project_id);
