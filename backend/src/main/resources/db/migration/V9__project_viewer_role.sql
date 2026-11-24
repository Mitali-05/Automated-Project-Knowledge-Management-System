ALTER TABLE project_members DROP CONSTRAINT project_members_role_check;
ALTER TABLE project_members ADD CONSTRAINT project_members_role_check
    CHECK (role IN ('owner', 'contributor', 'viewer'));
