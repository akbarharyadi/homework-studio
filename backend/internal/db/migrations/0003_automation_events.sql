-- A log of actions the automation took on its own (reports written, students
-- auto-flagged for support). Powers the admin Automation activity feed.

CREATE TABLE IF NOT EXISTS automation_events (
    id          VARCHAR(26) PRIMARY KEY,
    tenant_id   VARCHAR(26) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    kind        VARCHAR(30) NOT NULL,   -- 'report' | 'alert'
    student_id  VARCHAR(26),
    message     VARCHAR(300) NOT NULL DEFAULT '',
    value       DOUBLE PRECISION NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_events_tenant_time ON automation_events(tenant_id, created_at DESC);
