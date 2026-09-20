-- Homework Studio schema (plain SQL, applied at startup by internal/db).
-- Portable Postgres; ULID string PKs are generated in Go. No ORM.

CREATE TABLE IF NOT EXISTS tenants (
    id                   VARCHAR(26) PRIMARY KEY,
    name                 VARCHAR(200) NOT NULL,
    slug                 VARCHAR(100) NOT NULL UNIQUE,
    confidence_threshold DOUBLE PRECISION,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS users (
    id            VARCHAR(26) PRIMARY KEY,
    tenant_id     VARCHAR(26) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    email         VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name          VARCHAR(200) NOT NULL,
    role          VARCHAR(20) NOT NULL CHECK (role IN ('admin','teacher','parent','student')),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_users_tenant_email ON users(tenant_id, lower(email));

CREATE TABLE IF NOT EXISTS subjects (
    id         VARCHAR(26) PRIMARY KEY,
    tenant_id  VARCHAR(26) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name       VARCHAR(80) NOT NULL,
    color      VARCHAR(20) NOT NULL DEFAULT '#6366f1'
);

CREATE TABLE IF NOT EXISTS students (
    id             VARCHAR(26) PRIMARY KEY,
    tenant_id      VARCHAR(26) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name           VARCHAR(200) NOT NULL,
    grade_level    VARCHAR(40) NOT NULL DEFAULT '',
    parent_user_id VARCHAR(26) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS homeworks (
    id               VARCHAR(26) PRIMARY KEY,
    tenant_id        VARCHAR(26) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    student_id       VARCHAR(26) NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    subject_id       VARCHAR(26) REFERENCES subjects(id) ON DELETE SET NULL,
    title            VARCHAR(300) NOT NULL DEFAULT '',
    status           VARCHAR(20) NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending','processing','needs_review','graded','failed')),
    source_filename  VARCHAR(300) NOT NULL DEFAULT '',
    storage_key      VARCHAR(120) NOT NULL DEFAULT '',
    uploaded_by      VARCHAR(26) NOT NULL,
    detected_subject VARCHAR(80) NOT NULL DEFAULT '',
    score            DOUBLE PRECISION NOT NULL DEFAULT 0,
    max_score        DOUBLE PRECISION NOT NULL DEFAULT 0,
    percent          DOUBLE PRECISION NOT NULL DEFAULT 0,
    confidence       DOUBLE PRECISION NOT NULL DEFAULT 0,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_homeworks_student ON homeworks(student_id, created_at DESC);
CREATE INDEX IF NOT EXISTS ix_homeworks_tenant_status ON homeworks(tenant_id, status);

CREATE TABLE IF NOT EXISTS homework_items (
    id             VARCHAR(26) PRIMARY KEY,
    homework_id    VARCHAR(26) NOT NULL REFERENCES homeworks(id) ON DELETE CASCADE,
    question_no    INT NOT NULL DEFAULT 0,
    question_text  TEXT NOT NULL DEFAULT '',
    student_answer TEXT NOT NULL DEFAULT '',
    correct_answer TEXT NOT NULL DEFAULT '',
    is_correct     BOOLEAN,
    marks          DOUBLE PRECISION NOT NULL DEFAULT 0,
    max_marks      DOUBLE PRECISION NOT NULL DEFAULT 1,
    confidence     DOUBLE PRECISION NOT NULL DEFAULT 0,
    needs_review   BOOLEAN NOT NULL DEFAULT false
);
CREATE INDEX IF NOT EXISTS ix_items_homework ON homework_items(homework_id, question_no);

CREATE TABLE IF NOT EXISTS review_tasks (
    id          VARCHAR(26) PRIMARY KEY,
    tenant_id   VARCHAR(26) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    homework_id VARCHAR(26) NOT NULL REFERENCES homeworks(id) ON DELETE CASCADE,
    item_id     VARCHAR(26) REFERENCES homework_items(id) ON DELETE CASCADE,
    field_name  VARCHAR(80) NOT NULL DEFAULT '',
    reason      VARCHAR(300) NOT NULL DEFAULT '',
    status      VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (status IN ('open','resolved')),
    resolution  VARCHAR(300) NOT NULL DEFAULT '',
    resolved_by VARCHAR(26),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    resolved_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS ix_review_tenant_status ON review_tasks(tenant_id, status);

CREATE TABLE IF NOT EXISTS questions (
    id             VARCHAR(26) PRIMARY KEY,
    tenant_id      VARCHAR(26) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    subject_id     VARCHAR(26) NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    topic          VARCHAR(120) NOT NULL DEFAULT '',
    difficulty     VARCHAR(10) NOT NULL DEFAULT 'medium',
    stem           TEXT NOT NULL,
    options        JSONB NOT NULL DEFAULT '[]',
    answer         VARCHAR(400) NOT NULL DEFAULT '',
    explanation    TEXT NOT NULL DEFAULT '',
    marks          DOUBLE PRECISION NOT NULL DEFAULT 1,
    negative_marks DOUBLE PRECISION NOT NULL DEFAULT 0,
    ai_generated   BOOLEAN NOT NULL DEFAULT false
);
CREATE INDEX IF NOT EXISTS ix_questions_subject ON questions(subject_id, difficulty);

CREATE TABLE IF NOT EXISTS practice_sets (
    id          VARCHAR(26) PRIMARY KEY,
    tenant_id   VARCHAR(26) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    student_id  VARCHAR(26) NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    subject_id  VARCHAR(26) NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    status      VARCHAR(20) NOT NULL DEFAULT 'open',
    score       DOUBLE PRECISION NOT NULL DEFAULT 0,
    percent     DOUBLE PRECISION NOT NULL DEFAULT 0,
    snapshot    JSONB NOT NULL DEFAULT '[]',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    finished_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS practice_answers (
    id              VARCHAR(26) PRIMARY KEY,
    practice_set_id VARCHAR(26) NOT NULL REFERENCES practice_sets(id) ON DELETE CASCADE,
    question_id     VARCHAR(26) NOT NULL,
    selected        VARCHAR(400) NOT NULL DEFAULT '',
    is_correct      BOOLEAN NOT NULL DEFAULT false,
    marks           DOUBLE PRECISION NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS materials (
    id         VARCHAR(26) PRIMARY KEY,
    tenant_id  VARCHAR(26) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    subject_id VARCHAR(26) NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    title      VARCHAR(300) NOT NULL,
    source     VARCHAR(300) NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS material_chunks (
    id          VARCHAR(26) PRIMARY KEY,
    material_id VARCHAR(26) NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
    content     TEXT NOT NULL,
    embedding   JSONB NOT NULL DEFAULT '[]',
    page        INT NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS chat_sessions (
    id         VARCHAR(26) PRIMARY KEY,
    tenant_id  VARCHAR(26) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    student_id VARCHAR(26) NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    subject_id VARCHAR(26) REFERENCES subjects(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS chat_messages (
    id         VARCHAR(26) PRIMARY KEY,
    session_id VARCHAR(26) NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
    role       VARCHAR(20) NOT NULL,
    content    TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ai_usage (
    id                VARCHAR(26) PRIMARY KEY,
    tenant_id         VARCHAR(26) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    student_id        VARCHAR(26),
    feature           VARCHAR(40) NOT NULL,
    prompt_tokens     INT NOT NULL DEFAULT 0,
    completion_tokens INT NOT NULL DEFAULT 0,
    model             VARCHAR(80) NOT NULL DEFAULT '',
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
