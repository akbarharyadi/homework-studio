-- Auto-generated weekly reports, produced by the background scheduler.
-- One latest row per student (student_id UNIQUE, upserted each run).

CREATE TABLE IF NOT EXISTS student_reports (
    id              VARCHAR(26) PRIMARY KEY,
    tenant_id       VARCHAR(26) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    student_id      VARCHAR(26) NOT NULL UNIQUE REFERENCES students(id) ON DELETE CASCADE,
    period_end      DATE NOT NULL DEFAULT CURRENT_DATE,
    overall_average DOUBLE PRECISION NOT NULL DEFAULT 0,
    homeworks_done  INT NOT NULL DEFAULT 0,
    top_subject     VARCHAR(80) NOT NULL DEFAULT '',
    narrative       TEXT NOT NULL DEFAULT '',
    recap_json      JSONB NOT NULL DEFAULT '{}',
    generated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
