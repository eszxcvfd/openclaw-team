BEGIN;

DO $$
DECLARE
    app_table_name TEXT;
    app_tables TEXT[] := ARRAY[
        'agent_group_tools',
        'agent_groups',
        'agent_submodules',
        'analytics_snapshots',
        'auth_sessions',
        'backend_api_catalog',
        'company_policies',
        'contacts_directory',
        'conversations',
        'course_prerequisites',
        'course_skills',
        'courses',
        'departments',
        'document_permissions',
        'documents',
        'faq_items',
        'generated_artifacts',
        'learning_path_items',
        'learning_paths',
        'messages',
        'onboarding_plans',
        'onboarding_tasks',
        'permissions',
        'positions',
        'quiz_attempts',
        'quiz_questions',
        'quiz_templates',
        'reports',
        'role_permissions',
        'role_skill_requirements',
        'roles',
        'service_tokens',
        'session_contexts',
        'skills',
        'tool_call_logs',
        'tools',
        'training_attendance',
        'training_feedback',
        'training_sessions',
        'user_agent_access',
        'user_contexts',
        'user_courses',
        'user_learning_paths',
        'user_onboarding_tasks',
        'user_roles',
        'user_skills',
        'users'
    ];
BEGIN
    FOREACH app_table_name IN ARRAY app_tables
    LOOP
        IF EXISTS (
            SELECT 1
            FROM information_schema.tables t
            WHERE t.table_schema = 'app'
              AND t.table_name = app_table_name
        ) THEN
            EXECUTE format('ALTER TABLE app.%I SET SCHEMA public', app_table_name);
        END IF;
    END LOOP;
END $$;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.routines
        WHERE routine_schema = 'app'
          AND routine_name = 'set_updated_at'
    ) THEN
        ALTER FUNCTION app.set_updated_at() SET SCHEMA public;
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'app')
       AND NOT EXISTS (
           SELECT 1
           FROM information_schema.tables
           WHERE table_schema = 'app'
       )
       AND NOT EXISTS (
           SELECT 1
           FROM information_schema.routines
           WHERE routine_schema = 'app'
       ) THEN
        DROP SCHEMA app;
    END IF;
END $$;

COMMIT;
