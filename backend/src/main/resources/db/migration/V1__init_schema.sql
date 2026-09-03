-- Phase 0 schema: identity, orgs, projects, membership.
-- Later phases add: project_repositories, sync_jobs, contributors, knowledge_items,
-- knowledge_evidence, modules, documentation, knowledge_gaps, embeddings, ai_prompt_sessions.

CREATE TABLE organizations (
    id          BIGSERIAL PRIMARY KEY,
    name        VARCHAR(255) NOT NULL UNIQUE,
    created_at  TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE users (
    id             BIGSERIAL PRIMARY KEY,
    org_id         BIGINT NOT NULL REFERENCES organizations(id),
    name           VARCHAR(255) NOT NULL,
    email          VARCHAR(255) NOT NULL UNIQUE,
    password_hash  VARCHAR(255) NOT NULL,
    created_at     TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE projects (
    id           BIGSERIAL PRIMARY KEY,
    org_id       BIGINT NOT NULL REFERENCES organizations(id),
    name         VARCHAR(255) NOT NULL,
    description  TEXT,
    created_by   BIGINT NOT NULL REFERENCES users(id),
    created_at   TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE project_members (
    id          BIGSERIAL PRIMARY KEY,
    project_id  BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id     BIGINT NOT NULL REFERENCES users(id),
    role        VARCHAR(20) NOT NULL CHECK (role IN ('owner', 'contributor')),
    added_at    TIMESTAMP NOT NULL DEFAULT now(),
    UNIQUE (project_id, user_id)
);

CREATE INDEX idx_users_org_id ON users(org_id);
CREATE INDEX idx_projects_org_id ON projects(org_id);
CREATE INDEX idx_project_members_user_id ON project_members(user_id);
