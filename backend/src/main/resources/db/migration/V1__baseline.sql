-- PRISM baseline schema (replaces the seminar-1 V1..V4 history and the Phase-0/1 prototype migrations).
-- Point the backend at a NEW, empty database (or reset the dev database) before the first run.

CREATE TABLE organizations (
    id                          BIGSERIAL PRIMARY KEY,
    name                        VARCHAR(255) NOT NULL,
    invite_code                 VARCHAR(32)  NOT NULL UNIQUE,
    github_installation_id      VARCHAR(64)  UNIQUE,
    github_installation_verified BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at                  TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX uq_organizations_name_lower ON organizations (lower(name));

CREATE TABLE users (
    id             BIGSERIAL PRIMARY KEY,
    org_id         BIGINT       NOT NULL REFERENCES organizations(id),
    name           VARCHAR(255) NOT NULL,
    email          VARCHAR(255) NOT NULL UNIQUE,   -- always stored lower-case
    password_hash  VARCHAR(255) NOT NULL,
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX idx_users_org_id ON users(org_id);

CREATE TABLE projects (
    id           BIGSERIAL PRIMARY KEY,
    org_id       BIGINT       NOT NULL REFERENCES organizations(id),
    name         VARCHAR(255) NOT NULL,
    description  TEXT,
    created_by   BIGINT       NOT NULL REFERENCES users(id),
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX idx_projects_org_id ON projects(org_id);

-- Access control: a project is visible ONLY to the users listed here.
CREATE TABLE project_members (
    id          BIGSERIAL PRIMARY KEY,
    project_id  BIGINT      NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id     BIGINT      NOT NULL REFERENCES users(id)    ON DELETE CASCADE,
    role        VARCHAR(20) NOT NULL CHECK (role IN ('owner', 'contributor')),
    added_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (project_id, user_id)
);
CREATE INDEX idx_project_members_user_id ON project_members(user_id);

-- One project can be spread over several repositories. Only pointers are stored, never repository content.
CREATE TABLE project_repositories (
    id                 BIGSERIAL PRIMARY KEY,
    project_id         BIGINT       NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    provider           VARCHAR(30)  NOT NULL DEFAULT 'GITHUB',
    url                VARCHAR(500) NOT NULL,
    repo_owner         VARCHAR(255) NOT NULL,
    repo_name          VARCHAR(255) NOT NULL,
    sync_status        VARCHAR(20)  NOT NULL DEFAULT 'PENDING'
                           CHECK (sync_status IN ('PENDING', 'SYNCING', 'SYNCED', 'FAILED')),
    last_synced_at     TIMESTAMPTZ,
    last_sync_message  VARCHAR(500),
    added_at           TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX uq_project_repositories_url ON project_repositories (project_id, lower(url));

-- Extracted knowledge. Written by the extraction service through /api/ingest, read by the web app.
CREATE TABLE knowledge_items (
    id             BIGSERIAL PRIMARY KEY,
    project_id     BIGINT           NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    repository_id  BIGINT           REFERENCES project_repositories(id) ON DELETE SET NULL,
    external_id    VARCHAR(128),
    title          VARCHAR(512)     NOT NULL,
    knowledge_type VARCHAR(50)      NOT NULL,
    summary        TEXT             NOT NULL,
    details        TEXT,
    module         VARCHAR(255),
    confidence     DOUBLE PRECISION CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1)),
    created_at     TIMESTAMPTZ      NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ      NOT NULL DEFAULT now()
);
CREATE INDEX idx_knowledge_items_project_id ON knowledge_items(project_id);
-- Lets the extraction service re-send the same item idempotently.
CREATE UNIQUE INDEX uq_knowledge_items_external ON knowledge_items (project_id, external_id)
    WHERE external_id IS NOT NULL;

-- Evidence / provenance: where a piece of knowledge came from.
CREATE TABLE knowledge_evidence (
    id                 BIGSERIAL PRIMARY KEY,
    knowledge_item_id  BIGINT        NOT NULL REFERENCES knowledge_items(id) ON DELETE CASCADE,
    source_type        VARCHAR(30)   NOT NULL,
    source_ref         VARCHAR(512)  NOT NULL,
    url                VARCHAR(1024),
    excerpt            TEXT
);
CREATE INDEX idx_knowledge_evidence_item_id ON knowledge_evidence(knowledge_item_id);

-- Project history: platform events (members, repositories) and, later, GitHub activity from the extractor.
CREATE TABLE project_activity (
    id              BIGSERIAL PRIMARY KEY,
    project_id      BIGINT        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    event_type      VARCHAR(40)   NOT NULL,
    title           VARCHAR(512)  NOT NULL,
    actor_name      VARCHAR(255),
    repository_url  VARCHAR(500),
    source_ref      VARCHAR(255),
    url             VARCHAR(1024),
    occurred_at     TIMESTAMPTZ   NOT NULL DEFAULT now(),
    created_at      TIMESTAMPTZ   NOT NULL DEFAULT now()
);
CREATE INDEX idx_project_activity_project_time ON project_activity(project_id, occurred_at DESC);

CREATE TABLE notifications (
    id           BIGSERIAL PRIMARY KEY,
    user_id      BIGINT       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title        VARCHAR(255) NOT NULL,
    description  TEXT,
    is_read      BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX idx_notifications_user_created ON notifications(user_id, created_at DESC);
