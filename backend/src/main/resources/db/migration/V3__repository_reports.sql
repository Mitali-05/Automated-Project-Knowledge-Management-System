-- V3: the full extraction report (architecture, handover guide, verification) and generated PDF/PPTX per repository.

CREATE TABLE repository_reports (
    repository_id BIGINT      PRIMARY KEY REFERENCES project_repositories(id) ON DELETE CASCADE,
    project_id    BIGINT      NOT NULL    REFERENCES projects(id)             ON DELETE CASCADE,
    report        TEXT        NOT NULL,
    generated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_repository_reports_project_id ON repository_reports(project_id);

CREATE TABLE repository_report_files (
    id            BIGSERIAL   PRIMARY KEY,
    repository_id BIGINT      NOT NULL REFERENCES project_repositories(id) ON DELETE CASCADE,
    kind          VARCHAR(10) NOT NULL CHECK (kind IN ('pdf', 'pptx')),
    content       BYTEA       NOT NULL,
    size_bytes    BIGINT      NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (repository_id, kind)
);
