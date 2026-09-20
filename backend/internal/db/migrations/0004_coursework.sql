-- Coursework: the teacher uploads teaching material; the AI reads it and generates
-- an exam (+ teaching notes + tutor knowledge). Extends materials / questions /
-- practice_sets and adds the exams table. Idempotent (re-run at every startup).

ALTER TABLE materials ADD COLUMN IF NOT EXISTS uploaded_by     VARCHAR(26);
ALTER TABLE materials ADD COLUMN IF NOT EXISTS status          VARCHAR(20) NOT NULL DEFAULT 'ready';
ALTER TABLE materials ADD COLUMN IF NOT EXISTS storage_key     VARCHAR(120) NOT NULL DEFAULT '';
ALTER TABLE materials ADD COLUMN IF NOT EXISTS source_filename VARCHAR(300) NOT NULL DEFAULT '';
ALTER TABLE materials ADD COLUMN IF NOT EXISTS summary         TEXT NOT NULL DEFAULT '';

-- An exam is a teacher-facing, AI-generated set of questions grounded in a material.
CREATE TABLE IF NOT EXISTS exams (
    id             VARCHAR(26) PRIMARY KEY,
    tenant_id      VARCHAR(26) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    subject_id     VARCHAR(26) REFERENCES subjects(id) ON DELETE SET NULL,
    material_id    VARCHAR(26) REFERENCES materials(id) ON DELETE SET NULL,
    title          VARCHAR(300) NOT NULL DEFAULT '',
    status         VARCHAR(20) NOT NULL DEFAULT 'draft'
                   CHECK (status IN ('draft','needs_review','published')),
    question_count INT NOT NULL DEFAULT 0,
    created_by     VARCHAR(26),
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    published_at   TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS ix_exams_tenant_status ON exams(tenant_id, status);

-- Questions gain an exam link + a generation-confidence gate (bank rows keep the
-- defaults: exam_id NULL, confidence 1, needs_review false, approved true).
ALTER TABLE questions ADD COLUMN IF NOT EXISTS exam_id      VARCHAR(26) REFERENCES exams(id) ON DELETE CASCADE;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS confidence   DOUBLE PRECISION NOT NULL DEFAULT 1;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS needs_review BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS approved     BOOLEAN NOT NULL DEFAULT true;
CREATE INDEX IF NOT EXISTS ix_questions_exam ON questions(exam_id);

-- An attempt links back to the exam it came from (NULL for any ad-hoc set).
ALTER TABLE practice_sets ADD COLUMN IF NOT EXISTS exam_id VARCHAR(26) REFERENCES exams(id) ON DELETE SET NULL;
