CREATE TABLE IF NOT EXISTS chat_conversations (
    id BIGSERIAL PRIMARY KEY,
    project_id BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_project_user ON chat_conversations(project_id, user_id);

CREATE TABLE IF NOT EXISTS chat_messages (
    id BIGSERIAL PRIMARY KEY,
    conversation_id BIGINT NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    citations_json TEXT,
    freshness_warning TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation_id ON chat_messages(conversation_id);

CREATE TABLE IF NOT EXISTS repository_snapshots (
    id BIGSERIAL PRIMARY KEY,
    repository_id BIGINT NOT NULL REFERENCES project_repositories(id) ON DELETE CASCADE,
    project_id BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    branch VARCHAR(255) NOT NULL DEFAULT 'main',
    commit_sha VARCHAR(64) NOT NULL,
    sync_status VARCHAR(20) NOT NULL DEFAULT 'SYNCED',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_repository_snapshots_repo ON repository_snapshots(repository_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_repository_snapshots_project ON repository_snapshots(project_id);

CREATE TABLE IF NOT EXISTS repository_changes (
    id BIGSERIAL PRIMARY KEY,
    repository_id BIGINT NOT NULL REFERENCES project_repositories(id) ON DELETE CASCADE,
    project_id BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    from_commit VARCHAR(64),
    to_commit VARCHAR(64) NOT NULL,
    file_path VARCHAR(1024) NOT NULL,
    change_type VARCHAR(20) NOT NULL DEFAULT 'MODIFIED',
    commit_message TEXT,
    author VARCHAR(255),
    detected_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_repository_changes_repo ON repository_changes(repository_id);
CREATE INDEX IF NOT EXISTS idx_repository_changes_project ON repository_changes(project_id);
CREATE INDEX IF NOT EXISTS idx_repository_changes_file ON repository_changes(file_path);

CREATE TABLE IF NOT EXISTS knowledge_freshness (
    id BIGSERIAL PRIMARY KEY,
    knowledge_item_id BIGINT NOT NULL UNIQUE REFERENCES knowledge_items(id) ON DELETE CASCADE,
    project_id BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    repository_id BIGINT REFERENCES project_repositories(id) ON DELETE SET NULL,
    change_status VARCHAR(30) NOT NULL DEFAULT 'CURRENT'
        CHECK (change_status IN ('CURRENT', 'POTENTIALLY_STALE', 'OUTDATED', 'UNKNOWN')),
    age_status VARCHAR(20) NOT NULL DEFAULT 'FRESH'
        CHECK (age_status IN ('FRESH', 'STALE', 'OUTDATED')),
    last_verified_commit VARCHAR(64),
    affected_commit VARCHAR(64),
    changed_files TEXT,
    reason TEXT,
    detected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_verified_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    revalidation_status VARCHAR(30) NOT NULL DEFAULT 'NONE'
);
CREATE INDEX IF NOT EXISTS idx_knowledge_freshness_project ON knowledge_freshness(project_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_freshness_status ON knowledge_freshness(change_status);

CREATE TABLE IF NOT EXISTS knowledge_change_links (
    id BIGSERIAL PRIMARY KEY,
    knowledge_item_id BIGINT NOT NULL REFERENCES knowledge_items(id) ON DELETE CASCADE,
    repository_change_id BIGINT NOT NULL REFERENCES repository_changes(id) ON DELETE CASCADE,
    matched_file VARCHAR(1024) NOT NULL,
    matched_evidence_id BIGINT REFERENCES knowledge_evidence(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (knowledge_item_id, repository_change_id)
);
CREATE INDEX IF NOT EXISTS idx_knowledge_change_links_item ON knowledge_change_links(knowledge_item_id);

CREATE TABLE IF NOT EXISTS knowledge_vectors (
    id BIGSERIAL PRIMARY KEY,
    knowledge_item_id BIGINT NOT NULL REFERENCES knowledge_items(id) ON DELETE CASCADE,
    project_id BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    repository_id BIGINT REFERENCES project_repositories(id) ON DELETE SET NULL,
    embedding_text TEXT NOT NULL,
    dimensions INT DEFAULT 768,
    embedding_json TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_knowledge_vectors_project ON knowledge_vectors(project_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_vectors_item ON knowledge_vectors(knowledge_item_id);
