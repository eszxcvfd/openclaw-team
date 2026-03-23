"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
describe('tool_call_logs append-only migration', () => {
    it('adds trace_id and blocks update/delete mutations', () => {
        const migrationPath = (0, node_path_1.join)(__dirname, '../../../prisma/migrations/20260322150000_tool_call_logs_append_only/migration.sql');
        const sql = (0, node_fs_1.readFileSync)(migrationPath, 'utf8');
        expect(sql).toContain('ADD COLUMN IF NOT EXISTS trace_id VARCHAR(100)');
        expect(sql).toContain('CREATE INDEX IF NOT EXISTS idx_tool_call_logs_trace_id');
        expect(sql).toContain('BEFORE UPDATE OR DELETE');
        expect(sql).toContain('RAISE EXCEPTION');
    });
});
//# sourceMappingURL=tool-call-log-migration.spec.js.map