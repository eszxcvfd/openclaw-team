BEGIN;

ALTER TABLE public.tool_call_logs
ADD COLUMN IF NOT EXISTS trace_id VARCHAR(100);

UPDATE public.tool_call_logs
SET trace_id = gen_random_uuid()::text
WHERE trace_id IS NULL;

ALTER TABLE public.tool_call_logs
ALTER COLUMN trace_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_tool_call_logs_trace_id
ON public.tool_call_logs(trace_id);

CREATE OR REPLACE FUNCTION public.prevent_tool_call_logs_mutation()
RETURNS trigger AS $$
BEGIN
    RAISE EXCEPTION 'tool_call_logs is append-only; % is not allowed', TG_OP;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_tool_call_logs_append_only ON public.tool_call_logs;

CREATE TRIGGER trg_tool_call_logs_append_only
BEFORE UPDATE OR DELETE ON public.tool_call_logs
FOR EACH ROW
EXECUTE FUNCTION public.prevent_tool_call_logs_mutation();

COMMIT;
