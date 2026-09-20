-- Auto-remediation: when the scheduler flags an at-risk student, it creates a
-- targeted practice set in that student's weakest subject. `source` marks how a
-- set was created ('' = student-initiated, 'remediation' = coach-recommended by
-- the automation) so the student home can surface it. Idempotent.

ALTER TABLE practice_sets ADD COLUMN IF NOT EXISTS source VARCHAR(24) NOT NULL DEFAULT '';
CREATE INDEX IF NOT EXISTS ix_practice_sets_source
    ON practice_sets(tenant_id, student_id, status, source);
