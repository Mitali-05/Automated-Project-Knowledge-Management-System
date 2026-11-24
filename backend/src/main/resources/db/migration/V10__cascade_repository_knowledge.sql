ALTER TABLE knowledge_items DROP CONSTRAINT knowledge_items_repository_id_fkey;
ALTER TABLE knowledge_items ADD CONSTRAINT knowledge_items_repository_id_fkey
    FOREIGN KEY (repository_id) REFERENCES project_repositories(id) ON DELETE CASCADE;
