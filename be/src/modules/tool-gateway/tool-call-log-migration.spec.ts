import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('tool_call_logs append-only migration', () => {
  it('adds trace_id and blocks update/delete mutations', () => {
    const migrationPath = join(
      __dirname,
      '../../../prisma/migrations/20260322150000_tool_call_logs_append_only/migration.sql',
    );
    const sql = readFileSync(migrationPath, 'utf8');

    expect(sql).toContain('ADD COLUMN IF NOT EXISTS trace_id VARCHAR(100)');
    expect(sql).toContain('CREATE INDEX IF NOT EXISTS idx_tool_call_logs_trace_id');
    expect(sql).toContain('BEFORE UPDATE OR DELETE');
    expect(sql).toContain('RAISE EXCEPTION');
  });
});
