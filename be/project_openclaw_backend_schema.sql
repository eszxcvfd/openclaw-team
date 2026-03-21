
-- =========================================================
-- Project: OpenClaw + Backend + RBAC + Onboarding/Training
-- Database: PostgreSQL
-- Notes:
--   - Ready-to-run initial schema
--   - Uses UUID primary keys
--   - Uses JSONB for dynamic context/generated payload
--   - Uses the public schema
--   - Designed for 3 agent groups:
--       1) onboarding
--       2) learning_training
--       3) training_analytics
-- =========================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;

SET search_path TO public;

-- =========================================================
-- 1) CORE / AUTH / RBAC
-- =========================================================

CREATE TABLE IF NOT EXISTS departments (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code                VARCHAR(50) NOT NULL UNIQUE,
    name                VARCHAR(255) NOT NULL,
    description         TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS positions (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code                VARCHAR(50) NOT NULL UNIQUE,
    name                VARCHAR(255) NOT NULL,
    level_no            INTEGER NOT NULL DEFAULT 1 CHECK (level_no > 0),
    description         TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS users (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_code       VARCHAR(100) UNIQUE,
    email               CITEXT NOT NULL UNIQUE,
    password_hash       TEXT,
    full_name           VARCHAR(255) NOT NULL,
    phone               VARCHAR(50),
    avatar_url          TEXT,
    department_id       UUID REFERENCES departments(id) ON DELETE SET NULL,
    position_id         UUID REFERENCES positions(id) ON DELETE SET NULL,
    manager_id          UUID REFERENCES users(id) ON DELETE SET NULL,
    join_date           DATE,
    status              VARCHAR(30) NOT NULL DEFAULT 'active'
                            CHECK (status IN ('active','inactive','suspended','terminated')),
    is_email_verified   BOOLEAN NOT NULL DEFAULT FALSE,
    last_login_at       TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at          TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS roles (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code                VARCHAR(100) NOT NULL UNIQUE,
    name                VARCHAR(255) NOT NULL,
    description         TEXT,
    is_system           BOOLEAN NOT NULL DEFAULT FALSE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS permissions (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code                VARCHAR(150) NOT NULL UNIQUE,
    name                VARCHAR(255) NOT NULL,
    description         TEXT,
    resource_type       VARCHAR(100),
    action              VARCHAR(100),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS role_permissions (
    role_id             UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id       UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE IF NOT EXISTS user_roles (
    user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id             UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, role_id)
);

CREATE TABLE IF NOT EXISTS auth_sessions (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    refresh_token_hash  TEXT,
    ip_address          INET,
    user_agent          TEXT,
    expired_at          TIMESTAMPTZ,
    revoked_at          TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =========================================================
-- 2) AGENT / TOOL / API ACCESS CONTROL
-- =========================================================

CREATE TABLE IF NOT EXISTS agent_groups (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code                VARCHAR(100) NOT NULL UNIQUE,
    name                VARCHAR(255) NOT NULL,
    description         TEXT,
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS agent_submodules (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_group_id      UUID NOT NULL REFERENCES agent_groups(id) ON DELETE CASCADE,
    code                VARCHAR(100) NOT NULL UNIQUE,
    name                VARCHAR(255) NOT NULL,
    description         TEXT,
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_agent_access (
    user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    agent_group_id      UUID NOT NULL REFERENCES agent_groups(id) ON DELETE CASCADE,
    is_allowed          BOOLEAN NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, agent_group_id)
);

CREATE TABLE IF NOT EXISTS backend_api_catalog (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code                VARCHAR(120) NOT NULL UNIQUE,
    name                VARCHAR(255) NOT NULL,
    http_method         VARCHAR(10) NOT NULL CHECK (http_method IN ('GET','POST','PUT','PATCH','DELETE')),
    path                VARCHAR(500) NOT NULL,
    description         TEXT,
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tools (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code                VARCHAR(120) NOT NULL UNIQUE,
    name                VARCHAR(255) NOT NULL,
    description         TEXT,
    api_id              UUID REFERENCES backend_api_catalog(id) ON DELETE SET NULL,
    input_schema        JSONB NOT NULL DEFAULT '{}'::jsonb,
    output_schema       JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS agent_group_tools (
    agent_group_id      UUID NOT NULL REFERENCES agent_groups(id) ON DELETE CASCADE,
    tool_id             UUID NOT NULL REFERENCES tools(id) ON DELETE CASCADE,
    is_allowed          BOOLEAN NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (agent_group_id, tool_id)
);

CREATE TABLE IF NOT EXISTS service_tokens (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code                VARCHAR(120) NOT NULL UNIQUE,
    agent_group_id      UUID REFERENCES agent_groups(id) ON DELETE SET NULL,
    token_hash          TEXT NOT NULL,
    scopes              JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    expired_at          TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tool_call_logs (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id     UUID,
    message_id          UUID,
    agent_group_id      UUID REFERENCES agent_groups(id) ON DELETE SET NULL,
    tool_id             UUID REFERENCES tools(id) ON DELETE SET NULL,
    api_id              UUID REFERENCES backend_api_catalog(id) ON DELETE SET NULL,
    user_id             UUID REFERENCES users(id) ON DELETE SET NULL,
    request_payload     JSONB NOT NULL DEFAULT '{}'::jsonb,
    response_payload    JSONB NOT NULL DEFAULT '{}'::jsonb,
    http_status         INTEGER,
    success             BOOLEAN NOT NULL DEFAULT FALSE,
    error_message       TEXT,
    started_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    finished_at         TIMESTAMPTZ
);

-- =========================================================
-- 3) DOCUMENT / KNOWLEDGE / CONTEXT
-- =========================================================

CREATE TABLE IF NOT EXISTS documents (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code                VARCHAR(120) UNIQUE,
    title               VARCHAR(255) NOT NULL,
    category            VARCHAR(100) NOT NULL,
    group_code          VARCHAR(100),
    source_type         VARCHAR(30) NOT NULL DEFAULT 'file'
                            CHECK (source_type IN ('file','url','generated','inline')),
    file_path           TEXT,
    mime_type           VARCHAR(120),
    content_text        TEXT,
    content_json        JSONB,
    version_no          INTEGER NOT NULL DEFAULT 1 CHECK (version_no > 0),
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    created_by          UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS document_permissions (
    document_id         UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    role_id             UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    can_view            BOOLEAN NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (document_id, role_id)
);

CREATE TABLE IF NOT EXISTS user_contexts (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    context_json        JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS session_contexts (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_key         VARCHAR(255) NOT NULL UNIQUE,
    user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    agent_group_id      UUID REFERENCES agent_groups(id) ON DELETE SET NULL,
    context_json        JSONB NOT NULL DEFAULT '{}'::jsonb,
    expires_at          TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS generated_artifacts (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID REFERENCES users(id) ON DELETE SET NULL,
    agent_group_id      UUID REFERENCES agent_groups(id) ON DELETE SET NULL,
    artifact_type       VARCHAR(100) NOT NULL,
    title               VARCHAR(255),
    payload_json        JSONB NOT NULL DEFAULT '{}'::jsonb,
    file_path           TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =========================================================
-- 4) CHAT / CONVERSATION
-- =========================================================

CREATE TABLE IF NOT EXISTS conversations (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    agent_group_id      UUID REFERENCES agent_groups(id) ON DELETE SET NULL,
    channel             VARCHAR(50) NOT NULL DEFAULT 'webchat',
    session_key         VARCHAR(255) NOT NULL,
    status              VARCHAR(30) NOT NULL DEFAULT 'open'
                            CHECK (status IN ('open','closed','archived')),
    started_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    ended_at            TIMESTAMPTZ,
    UNIQUE (user_id, session_key)
);

CREATE TABLE IF NOT EXISTS messages (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id     UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_type         VARCHAR(20) NOT NULL CHECK (sender_type IN ('user','assistant','system','tool')),
    sender_user_id      UUID REFERENCES users(id) ON DELETE SET NULL,
    content             TEXT,
    metadata            JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_tool_logs_conversation'
    ) THEN
        ALTER TABLE tool_call_logs
            ADD CONSTRAINT fk_tool_logs_conversation
            FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_tool_logs_message'
    ) THEN
        ALTER TABLE tool_call_logs
            ADD CONSTRAINT fk_tool_logs_message
            FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE SET NULL;
    END IF;
END $$;

-- =========================================================
-- 5) ONBOARDING
-- =========================================================

CREATE TABLE IF NOT EXISTS onboarding_plans (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code                VARCHAR(100) NOT NULL UNIQUE,
    name                VARCHAR(255) NOT NULL,
    department_id       UUID REFERENCES departments(id) ON DELETE SET NULL,
    position_id         UUID REFERENCES positions(id) ON DELETE SET NULL,
    duration_days       INTEGER NOT NULL DEFAULT 30 CHECK (duration_days > 0),
    description         TEXT,
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS onboarding_tasks (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id             UUID NOT NULL REFERENCES onboarding_plans(id) ON DELETE CASCADE,
    code                VARCHAR(100) NOT NULL,
    task_name           VARCHAR(255) NOT NULL,
    description         TEXT,
    order_no            INTEGER NOT NULL DEFAULT 1,
    due_day             INTEGER NOT NULL DEFAULT 1,
    required            BOOLEAN NOT NULL DEFAULT TRUE,
    doc_id              UUID REFERENCES documents(id) ON DELETE SET NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (plan_id, code)
);

CREATE TABLE IF NOT EXISTS user_onboarding_tasks (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    onboarding_task_id  UUID NOT NULL REFERENCES onboarding_tasks(id) ON DELETE CASCADE,
    status              VARCHAR(30) NOT NULL DEFAULT 'pending'
                            CHECK (status IN ('pending','in_progress','completed','skipped','blocked')),
    assigned_by         UUID REFERENCES users(id) ON DELETE SET NULL,
    assigned_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at        TIMESTAMPTZ,
    notes               TEXT,
    UNIQUE (user_id, onboarding_task_id)
);

CREATE TABLE IF NOT EXISTS faq_items (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category            VARCHAR(100) NOT NULL,
    audience            VARCHAR(100) NOT NULL DEFAULT 'all',
    question            TEXT NOT NULL,
    answer              TEXT NOT NULL,
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS contacts_directory (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name                VARCHAR(255) NOT NULL,
    department_id       UUID REFERENCES departments(id) ON DELETE SET NULL,
    role_title          VARCHAR(255),
    email               CITEXT,
    phone               VARCHAR(50),
    support_type        VARCHAR(100),
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS company_policies (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code                VARCHAR(120) NOT NULL UNIQUE,
    title               VARCHAR(255) NOT NULL,
    category            VARCHAR(100) NOT NULL,
    document_id         UUID REFERENCES documents(id) ON DELETE SET NULL,
    version_label       VARCHAR(50),
    effective_date      DATE,
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =========================================================
-- 6) LEARNING / TRAINING
-- =========================================================

CREATE TABLE IF NOT EXISTS skills (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code                VARCHAR(100) NOT NULL UNIQUE,
    name                VARCHAR(255) NOT NULL,
    category            VARCHAR(100),
    description         TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_skills (
    user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    skill_id            UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    level_no            INTEGER NOT NULL DEFAULT 0 CHECK (level_no BETWEEN 0 AND 10),
    last_assessed_at    TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, skill_id)
);

CREATE TABLE IF NOT EXISTS role_skill_requirements (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    position_id         UUID NOT NULL REFERENCES positions(id) ON DELETE CASCADE,
    skill_id            UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    required_level      INTEGER NOT NULL CHECK (required_level BETWEEN 1 AND 10),
    priority            INTEGER NOT NULL DEFAULT 1 CHECK (priority > 0),
    UNIQUE (position_id, skill_id)
);

CREATE TABLE IF NOT EXISTS courses (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code                VARCHAR(100) NOT NULL UNIQUE,
    title               VARCHAR(255) NOT NULL,
    description         TEXT,
    category            VARCHAR(100),
    level_no            INTEGER NOT NULL DEFAULT 1 CHECK (level_no > 0),
    duration_hours      NUMERIC(8,2) NOT NULL DEFAULT 0 CHECK (duration_hours >= 0),
    format              VARCHAR(50) NOT NULL DEFAULT 'self_paced'
                            CHECK (format IN ('self_paced','live','hybrid')),
    content_document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS course_skills (
    course_id           UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    skill_id            UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    outcome_level       INTEGER NOT NULL DEFAULT 1 CHECK (outcome_level BETWEEN 1 AND 10),
    PRIMARY KEY (course_id, skill_id)
);

CREATE TABLE IF NOT EXISTS course_prerequisites (
    course_id               UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    prerequisite_course_id  UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    PRIMARY KEY (course_id, prerequisite_course_id),
    CONSTRAINT chk_course_not_self_prereq CHECK (course_id <> prerequisite_course_id)
);

CREATE TABLE IF NOT EXISTS user_courses (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id           UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    status              VARCHAR(30) NOT NULL DEFAULT 'not_started'
                            CHECK (status IN ('not_started','in_progress','completed','failed','cancelled')),
    progress_percent    NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (progress_percent >= 0 AND progress_percent <= 100),
    score               NUMERIC(5,2) CHECK (score >= 0 AND score <= 100),
    enrolled_at         TIMESTAMPTZ,
    started_at          TIMESTAMPTZ,
    completed_at        TIMESTAMPTZ,
    UNIQUE (user_id, course_id)
);

CREATE TABLE IF NOT EXISTS learning_paths (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code                VARCHAR(100) NOT NULL UNIQUE,
    name                VARCHAR(255) NOT NULL,
    department_id       UUID REFERENCES departments(id) ON DELETE SET NULL,
    position_id         UUID REFERENCES positions(id) ON DELETE SET NULL,
    target_level        INTEGER,
    description         TEXT,
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS learning_path_items (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    learning_path_id    UUID NOT NULL REFERENCES learning_paths(id) ON DELETE CASCADE,
    course_id           UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    order_no            INTEGER NOT NULL,
    required            BOOLEAN NOT NULL DEFAULT TRUE,
    UNIQUE (learning_path_id, order_no),
    UNIQUE (learning_path_id, course_id)
);

CREATE TABLE IF NOT EXISTS user_learning_paths (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    learning_path_id    UUID REFERENCES learning_paths(id) ON DELETE SET NULL,
    generated_payload   JSONB NOT NULL DEFAULT '{}'::jsonb,
    status              VARCHAR(30) NOT NULL DEFAULT 'active'
                            CHECK (status IN ('active','completed','archived')),
    generated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS quiz_templates (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code                VARCHAR(100) NOT NULL UNIQUE,
    title               VARCHAR(255) NOT NULL,
    course_id           UUID REFERENCES courses(id) ON DELETE SET NULL,
    difficulty          VARCHAR(30) NOT NULL DEFAULT 'medium'
                            CHECK (difficulty IN ('easy','medium','hard')),
    question_count      INTEGER NOT NULL DEFAULT 10 CHECK (question_count > 0),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS quiz_questions (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quiz_template_id    UUID NOT NULL REFERENCES quiz_templates(id) ON DELETE CASCADE,
    question_type       VARCHAR(30) NOT NULL DEFAULT 'single_choice'
                            CHECK (question_type IN ('single_choice','multiple_choice','short_answer','true_false')),
    question_text       TEXT NOT NULL,
    options_json        JSONB NOT NULL DEFAULT '[]'::jsonb,
    answer_key_json     JSONB NOT NULL DEFAULT '{}'::jsonb,
    explanation         TEXT,
    score_weight        NUMERIC(6,2) NOT NULL DEFAULT 1 CHECK (score_weight > 0),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS quiz_attempts (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    quiz_template_id    UUID NOT NULL REFERENCES quiz_templates(id) ON DELETE CASCADE,
    submitted_answers   JSONB NOT NULL DEFAULT '{}'::jsonb,
    score               NUMERIC(5,2) CHECK (score >= 0 AND score <= 100),
    duration_seconds    INTEGER CHECK (duration_seconds >= 0),
    started_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    submitted_at        TIMESTAMPTZ
);

-- =========================================================
-- 7) ANALYTICS / FEEDBACK / REPORTING
-- =========================================================

CREATE TABLE IF NOT EXISTS training_sessions (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id           UUID REFERENCES courses(id) ON DELETE SET NULL,
    title               VARCHAR(255) NOT NULL,
    trainer_name        VARCHAR(255),
    start_time          TIMESTAMPTZ NOT NULL,
    end_time            TIMESTAMPTZ NOT NULL,
    location            VARCHAR(255),
    notes               TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_training_session_time CHECK (end_time > start_time)
);

CREATE TABLE IF NOT EXISTS training_attendance (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id          UUID NOT NULL REFERENCES training_sessions(id) ON DELETE CASCADE,
    user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    attendance_status   VARCHAR(30) NOT NULL DEFAULT 'present'
                            CHECK (attendance_status IN ('present','absent','late','excused')),
    checked_at          TIMESTAMPTZ,
    UNIQUE (session_id, user_id)
);

CREATE TABLE IF NOT EXISTS training_feedback (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id           UUID REFERENCES courses(id) ON DELETE SET NULL,
    session_id          UUID REFERENCES training_sessions(id) ON DELETE SET NULL,
    rating              INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment             TEXT,
    sentiment_label     VARCHAR(30)
                            CHECK (sentiment_label IN ('positive','neutral','negative') OR sentiment_label IS NULL),
    topics_json         JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS reports (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_type         VARCHAR(100) NOT NULL,
    period_start        DATE,
    period_end          DATE,
    generated_by        UUID REFERENCES users(id) ON DELETE SET NULL,
    title               VARCHAR(255) NOT NULL,
    summary_json        JSONB NOT NULL DEFAULT '{}'::jsonb,
    file_path           TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS analytics_snapshots (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    snapshot_date       DATE NOT NULL,
    department_id       UUID REFERENCES departments(id) ON DELETE SET NULL,
    position_id         UUID REFERENCES positions(id) ON DELETE SET NULL,
    completion_rate     NUMERIC(5,2) CHECK (completion_rate >= 0 AND completion_rate <= 100),
    avg_score           NUMERIC(5,2) CHECK (avg_score >= 0 AND avg_score <= 100),
    satisfaction_score  NUMERIC(5,2) CHECK (satisfaction_score >= 0 AND satisfaction_score <= 100),
    dropout_rate        NUMERIC(5,2) CHECK (dropout_rate >= 0 AND dropout_rate <= 100),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (snapshot_date, department_id, position_id)
);

-- =========================================================
-- 8) INDEXES
-- =========================================================

CREATE INDEX IF NOT EXISTS idx_users_department_id ON users(department_id);
CREATE INDEX IF NOT EXISTS idx_users_position_id ON users(position_id);
CREATE INDEX IF NOT EXISTS idx_users_manager_id ON users(manager_id);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);

CREATE INDEX IF NOT EXISTS idx_documents_category ON documents(category);
CREATE INDEX IF NOT EXISTS idx_documents_group_code ON documents(group_code);
CREATE INDEX IF NOT EXISTS idx_documents_content_json_gin ON documents USING GIN (content_json);

CREATE INDEX IF NOT EXISTS idx_user_contexts_context_json_gin ON user_contexts USING GIN (context_json);
CREATE INDEX IF NOT EXISTS idx_session_contexts_context_json_gin ON session_contexts USING GIN (context_json);
CREATE INDEX IF NOT EXISTS idx_generated_artifacts_payload_json_gin ON generated_artifacts USING GIN (payload_json);

CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_agent_group_id ON conversations(agent_group_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);

CREATE INDEX IF NOT EXISTS idx_tool_call_logs_user_id ON tool_call_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_tool_call_logs_tool_id ON tool_call_logs(tool_id);
CREATE INDEX IF NOT EXISTS idx_tool_call_logs_created ON tool_call_logs(started_at);

CREATE INDEX IF NOT EXISTS idx_user_onboarding_tasks_user_id ON user_onboarding_tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_user_onboarding_tasks_status ON user_onboarding_tasks(status);

CREATE INDEX IF NOT EXISTS idx_user_skills_user_id ON user_skills(user_id);
CREATE INDEX IF NOT EXISTS idx_user_courses_user_id ON user_courses(user_id);
CREATE INDEX IF NOT EXISTS idx_user_courses_status ON user_courses(status);
CREATE INDEX IF NOT EXISTS idx_user_learning_paths_user_id ON user_learning_paths(user_id);

CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user_id ON quiz_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_training_feedback_course_id ON training_feedback(course_id);
CREATE INDEX IF NOT EXISTS idx_training_feedback_user_id ON training_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_training_attendance_user_id ON training_attendance(user_id);
CREATE INDEX IF NOT EXISTS idx_reports_type ON reports(report_type);

-- =========================================================
-- 9) UPDATED_AT TRIGGER
-- =========================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_departments_updated_at') THEN
        CREATE TRIGGER trg_departments_updated_at BEFORE UPDATE ON departments
        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_positions_updated_at') THEN
        CREATE TRIGGER trg_positions_updated_at BEFORE UPDATE ON positions
        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_users_updated_at') THEN
        CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON users
        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_roles_updated_at') THEN
        CREATE TRIGGER trg_roles_updated_at BEFORE UPDATE ON roles
        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_agent_groups_updated_at') THEN
        CREATE TRIGGER trg_agent_groups_updated_at BEFORE UPDATE ON agent_groups
        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_agent_submodules_updated_at') THEN
        CREATE TRIGGER trg_agent_submodules_updated_at BEFORE UPDATE ON agent_submodules
        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_tools_updated_at') THEN
        CREATE TRIGGER trg_tools_updated_at BEFORE UPDATE ON tools
        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_documents_updated_at') THEN
        CREATE TRIGGER trg_documents_updated_at BEFORE UPDATE ON documents
        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_onboarding_plans_updated_at') THEN
        CREATE TRIGGER trg_onboarding_plans_updated_at BEFORE UPDATE ON onboarding_plans
        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_onboarding_tasks_updated_at') THEN
        CREATE TRIGGER trg_onboarding_tasks_updated_at BEFORE UPDATE ON onboarding_tasks
        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_faq_items_updated_at') THEN
        CREATE TRIGGER trg_faq_items_updated_at BEFORE UPDATE ON faq_items
        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_contacts_directory_updated_at') THEN
        CREATE TRIGGER trg_contacts_directory_updated_at BEFORE UPDATE ON contacts_directory
        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_company_policies_updated_at') THEN
        CREATE TRIGGER trg_company_policies_updated_at BEFORE UPDATE ON company_policies
        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_skills_updated_at') THEN
        CREATE TRIGGER trg_skills_updated_at BEFORE UPDATE ON skills
        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_user_skills_updated_at') THEN
        CREATE TRIGGER trg_user_skills_updated_at BEFORE UPDATE ON user_skills
        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_courses_updated_at') THEN
        CREATE TRIGGER trg_courses_updated_at BEFORE UPDATE ON courses
        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_learning_paths_updated_at') THEN
        CREATE TRIGGER trg_learning_paths_updated_at BEFORE UPDATE ON learning_paths
        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_user_learning_paths_updated_at') THEN
        CREATE TRIGGER trg_user_learning_paths_updated_at BEFORE UPDATE ON user_learning_paths
        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_quiz_templates_updated_at') THEN
        CREATE TRIGGER trg_quiz_templates_updated_at BEFORE UPDATE ON quiz_templates
        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_session_contexts_updated_at') THEN
        CREATE TRIGGER trg_session_contexts_updated_at BEFORE UPDATE ON session_contexts
        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    END IF;
END$$;

-- =========================================================
-- 10) SEED MINIMUM AGENT GROUPS
-- =========================================================

INSERT INTO agent_groups (code, name, description)
VALUES
    ('onboarding', 'Onboarding Assistant', 'Hỗ trợ nhân viên mới, FAQ, checklist, policy'),
    ('learning_training', 'Learning & Training Agent', 'Đề xuất khóa học, lộ trình học, quiz'),
    ('training_analytics', 'Training Analytics Agent', 'Phân tích feedback, tiến độ, báo cáo')
ON CONFLICT (code) DO NOTHING;

COMMIT;
