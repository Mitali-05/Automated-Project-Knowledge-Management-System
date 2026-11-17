CREATE TABLE github_connection_selections (
 id UUID PRIMARY KEY,
 user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 org_id BIGINT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
 installations TEXT NOT NULL,
 expires_at TIMESTAMPTZ NOT NULL DEFAULT now()+interval '10 minutes'
);
