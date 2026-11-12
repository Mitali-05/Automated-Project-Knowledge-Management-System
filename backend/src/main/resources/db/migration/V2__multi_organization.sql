-- V2: a user can belong to many organizations (like GitHub), plus an automatic personal workspace.
-- Existing data is preserved: every user keeps their current organization and gains a personal one.

ALTER TABLE organizations ADD COLUMN type VARCHAR(20) NOT NULL DEFAULT 'TEAM'
    CHECK (type IN ('PERSONAL', 'TEAM'));
ALTER TABLE organizations ADD COLUMN personal_user_id BIGINT UNIQUE REFERENCES users(id) ON DELETE CASCADE;
-- Personal workspaces cannot be joined, so they have no invite code.
ALTER TABLE organizations ALTER COLUMN invite_code DROP NOT NULL;

-- Team names stay unique; personal workspace names ("Asha's workspace") may repeat.
DROP INDEX uq_organizations_name_lower;
CREATE UNIQUE INDEX uq_organizations_team_name_lower ON organizations (lower(name)) WHERE type = 'TEAM';

CREATE TABLE organization_members (
    id         BIGSERIAL PRIMARY KEY,
    org_id     BIGINT      NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id    BIGINT      NOT NULL REFERENCES users(id)         ON DELETE CASCADE,
    role       VARCHAR(20) NOT NULL CHECK (role IN ('owner', 'admin', 'member')),
    joined_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (org_id, user_id)
);
CREATE INDEX idx_organization_members_user_id ON organization_members(user_id);

-- Existing users become members of the organization they signed up with; the earliest one is its owner.
INSERT INTO organization_members (org_id, user_id, role, joined_at)
SELECT u.org_id, u.id,
       CASE WHEN u.id = (SELECT MIN(u2.id) FROM users u2 WHERE u2.org_id = u.org_id) THEN 'owner' ELSE 'member' END,
       u.created_at
FROM users u;

-- Every existing user also gets a personal workspace.
INSERT INTO organizations (name, type, personal_user_id)
SELECT left(u.name, 100) || '''s workspace', 'PERSONAL', u.id FROM users u;

INSERT INTO organization_members (org_id, user_id, role)
SELECT o.id, o.personal_user_id, 'owner' FROM organizations o WHERE o.type = 'PERSONAL';

ALTER TABLE users DROP COLUMN org_id;
