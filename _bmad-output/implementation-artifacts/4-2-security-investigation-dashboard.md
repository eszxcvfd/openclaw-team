# Story 4.2: Security Investigation Dashboard

Status: review

## Story

As a Security Administrator,
I want an interface to look up and filter past audit logs by user, date, or tool name,
so that I can trace exactly what the AI was querying during a specific conversation.

## Acceptance Criteria

1. **Given** the Security Admin is logged into their portal
2. **When** they navigate to the `Audit Logs` view
3. **Then** the Frontend must display a paginated, filterable table fetched from the Backend
4. **And** the table must support filtering by at least user, date range, and tool name
5. **And** each row must expose the audit context needed for investigation, including `traceId`, `conversationId`, result status, and the time of the event
6. **And** clicking a logged `conversationId` must reveal the exact token scope used for that event
7. **And** the dashboard must handle denied or partially trusted audit rows where `user_id`, `tool_id`, or `conversation_id` may be null without crashing or hiding the event

## Tasks / Subtasks

- [x] Task 1: Expose a backend read API for security audit investigation (AC: 1, 3, 4, 5, 6, 7)
  - [x] Add an admin-only external API under `be/src/modules/` that serves paginated `tool_call_logs` data through the backend security boundary rather than reading directly from the database in the frontend.
  - [x] Keep the endpoint under the external `/api/*` namespace and return the repo-standard success/error wrapper with `meta.traceId`.
  - [x] Support query params for page, page size, date range, user identifier, tool name/code, success state, and free-text trace lookup when feasible.
  - [x] Add a detail read path that returns the selected log row with the exact stored scope and enough structured payload context for investigation.

- [x] Task 2: Implement backend query and mapping logic against append-only audit data (AC: 3, 4, 5, 6, 7)
  - [x] Read from `tool_call_logs` as the source of truth and join only the related reference data needed for display (user identity, tool metadata, agent group, conversation).
  - [x] Design the response mapper so rows with null foreign keys still render meaningfully by falling back to payload metadata captured in Story 4.1.
  - [x] Preserve append-only guarantees by keeping this story strictly read-only; do not add any update, delete, or “mark reviewed” behavior on audit rows.
  - [x] Surface the exact token scope from the stored audit payload in the detail response rather than recomputing scope from current permissions.

- [x] Task 3: Add the admin dashboard route and table workflow in the frontend (AC: 1, 2, 3, 4, 5, 6, 7)
  - [x] Add an admin-protected route alongside `admin/roles`, preferably `admin/audit-logs`, in `fe/src/router.jsx` and guard it with `AdminRoute`.
  - [x] Build the page using the existing dashboard shell patterns from `RoleManagementPage.jsx` and shared classes from `fe/src/App.css` so the admin console stays visually consistent.
  - [x] Add a dedicated service in `fe/src/services/` to fetch the paginated list and the selected audit log detail through the existing authenticated `apiClient`.
  - [x] Render a filterable table with pagination controls, loading state, empty state, and error state.
  - [x] Make `conversationId` interactive so the admin can open a detail panel, drawer, or inline inspector showing the exact scope used for that audit event.

- [x] Task 4: Make the investigation UI safe and useful for real audit scenarios (AC: 4, 5, 6, 7)
  - [x] Display investigation-first fields such as event time, result status, HTTP status, user identity or fallback label, tool label or fallback label, `traceId`, and `conversationId`.
  - [x] Show denied events clearly instead of blending them with successful calls; investigators must be able to see rejected activity quickly.
  - [x] Avoid exposing secrets: do not render raw bearer tokens, authorization headers, or unrelated sensitive payload material.
  - [x] Handle missing UX documentation by keeping the screen simple, scannable, and aligned with the existing admin dashboard language instead of inventing a new design system.

- [x] Task 5: Add focused verification for backend filters and frontend investigation behavior (AC: 3, 4, 5, 6, 7)
  - [x] Add backend tests covering pagination, filters, detail retrieval, admin authorization, and null-FK denied rows.
  - [x] Add frontend tests for filter state, loading/error handling, and opening the detail view from `conversationId`.
  - [x] Verify the final flow manually or via automated UI tests so an admin can load the page, filter results, and inspect a row’s exact scope successfully.

## Dev Notes

### Story Intent

Story 4.2 is the read-side investigation surface for the append-only audit trail established in Story 4.1. The goal is not generic analytics; it is a security-focused admin console that lets investigators trace AI tool activity safely, quickly, and without weakening the backend-controlled trust boundary.

### Epic and Product Context

- Epic 4 exists to provide a transparent audit trail for all AI tool calls so Security/Admin users can investigate incidents. [Source: `_bmad-output/planning-artifacts/epics.md:99`]
- PRD scenario 4 describes the security admin correlating `traceId` with a blocked AI attempt, which means the dashboard must represent both successful and denied tool calls. [Source: `_bmad-output/planning-artifacts/prd.md:69`]
- FR12 requires direct review of detailed tool-call audit logs, including `traceId`, content, and execution error result details. [Source: `_bmad-output/planning-artifacts/prd.md:127`]
- NFR6 and NFR7 require end-to-end `conversationId` traceability and append-only integrity, so investigation data must come from the database audit trail and remain read-only. [Source: `_bmad-output/planning-artifacts/implementation-readiness-report-2026-03-22.md:55`]

### Previous Story Intelligence

- Story 4.1 already established `tool_call_logs` as the canonical audit table and added a first-class `trace_id` column plus an append-only trigger; this story must only read from that table. [Source: `_bmad-output/implementation-artifacts/4-1-append-only-audit-tailing-logger.md:35`]
- Guard-denied events intentionally leave verified foreign keys null until trust is established, while preserving raw diagnostic metadata in payload JSON. The dashboard must not assume `user_id`, `tool_id`, or `conversation_id` are always present. [Source: `_bmad-output/implementation-artifacts/4-1-append-only-audit-tailing-logger.md:33`]
- `tool_id` may be null when mapping is not deterministic; UI filters and labels need a fallback path based on stored payload metadata or API metadata instead of hiding the row. [Source: `_bmad-output/implementation-artifacts/4-1-append-only-audit-tailing-logger.md:97`]
- Audit persistence is designed to be fail-safe and non-blocking, so the dashboard should present the available audit evidence without claiming absolute completeness for every request. [Source: `_bmad-output/implementation-artifacts/4-1-append-only-audit-tailing-logger.md:209`]

### Current Codebase Intelligence

- Frontend admin routing already exists in `fe/src/router.jsx` with `admin/roles` protected by `AdminRoute`, making this the right pattern to extend for an audit dashboard. [Source: `fe/src/router.jsx:27`; `fe/src/components/AdminRoute.jsx:4`]
- The current admin UI shell lives in `fe/src/pages/RoleManagementPage.jsx` and uses shared `dashboard-*` styles from `fe/src/App.css`; reuse that shell instead of inventing a parallel admin layout. [Source: `fe/src/pages/RoleManagementPage.jsx:83`; `fe/src/App.css:217`]
- Frontend data fetching is already standardized around TanStack Query and `apiClient`, so the audit dashboard should follow the same query/mutation/service structure. [Source: `fe/src/main.jsx:3`; `fe/src/services/apiClient.js:4`; `fe/src/pages/RoleManagementPage.jsx:16`]
- Backend admin APIs already follow the external `/api/*` namespace with controller + service separation in `users.controller.ts` and `users.service.ts`; the audit dashboard should mirror that structure. [Source: `be/src/modules/users/users.controller.ts:7`; `be/src/modules/users/users.service.ts:8`]

### Data Contract and Investigation Fields

- The `tool_call_logs` Prisma model currently exposes the fields this dashboard can rely on directly: `trace_id`, `conversation_id`, `message_id`, `agent_group_id`, `tool_id`, `api_id`, `user_id`, `request_payload`, `response_payload`, `http_status`, `success`, `error_message`, `started_at`, and `finished_at`. [Source: `be/prisma/schema.prisma:565`]
- Indexed fields already exist for `trace_id`, `started_at`, `tool_id`, and `user_id`, so filtering should lean on those columns before falling back to expensive payload inspection. [Source: `be/prisma/schema.prisma:588`]
- The detail view should expose the exact stored token scope from audit payload data, not a recomputed scope derived from current role assignments, because the acceptance criteria require the scope used at the time of the event. [Source: `_bmad-output/planning-artifacts/epics.md:236`; `_bmad-output/implementation-artifacts/4-1-append-only-audit-tailing-logger.md:30`]
- Denied rows may have null verified identifiers by design; show explicit fallback labels such as `Unverified request`, `Unknown tool`, or `No conversation linked` rather than dropping those events from the table.

### Architecture Compliance

- Keep the flow `Frontend -> Backend external API -> service -> Prisma/DB`; do not let the frontend read audit data directly and do not introduce any OpenClaw-to-DB shortcut. [Source: `AGENTS.md`; `be/AGENTS.md`; `_bmad-output/planning-artifacts/architecture.md:47`]
- The backend remains the security boundary for who may inspect audit data. Follow the same auth/authorization posture as existing admin APIs and keep controller logic thin. [Source: `be/AGENTS.md`; `be/src/modules/users/users.controller.ts:8`]
- All API responses should preserve the repo-standard wrapper with `success`, `data`, and `meta.traceId`. [Source: `_bmad-output/planning-artifacts/architecture.md:174`]
- This is an external admin dashboard story, not an internal tool API story. Do not place it under `/internal/tools/*` and do not require an `internal_scoped_token` for the dashboard view. [Source: `AGENTS.md`; `be/AGENTS.md`]

### File Structure Requirements

- Existing frontend files likely to change:
  - `fe/src/router.jsx`
  - `fe/src/pages/RoleManagementPage.jsx` (shared admin-shell reference only; avoid accidental regressions)
  - `fe/src/App.css`
  - `fe/src/services/apiClient.js`
- Likely new frontend files:
  - `fe/src/pages/AuditLogsPage.jsx`
  - `fe/src/services/auditService.js`
  - optional focused UI helpers/components colocated under `fe/src/components/` if the table/detail panel becomes too large for a single page file
- Existing backend files likely to change:
  - `be/src/app.module.ts`
  - a new or existing admin-facing module under `be/src/modules/` following controller/service separation
- Likely new backend files:
  - `be/src/modules/audit/audit.controller.ts` and `be/src/modules/audit/audit.service.ts`, or an equivalently named admin-facing audit module aligned with backend conventions
  - DTO files for list filters and detail responses
  - backend unit/integration tests for list/detail behaviors and admin authorization

### Testing Requirements

- Backend tests must prove the list API filters by user, date range, tool, and success state correctly while returning standardized wrappers.
- Backend detail tests must prove the selected audit event returns the exact stored scope and still works for denied events with null verified foreign keys.
- Frontend tests must prove that the admin route is protected, filters update the query, empty/error states render, and clicking `conversationId` opens the detail view.
- Verification should cover at least one successful event and one denied event so the UI does not accidentally optimize only for the happy path.

### UX and Scope Boundaries

- No dedicated UX document exists yet, and the implementation-readiness report explicitly warns against inventing UI freely. Keep the experience aligned with the existing admin dashboard shell and favor clarity over novelty. [Source: `_bmad-output/planning-artifacts/implementation-readiness-report-2026-03-22.md:104`]
- This story is about investigation visibility only. Do not add mutation features such as editing, deleting, acknowledging, replaying, or exporting audit events unless a later story explicitly asks for them.
- Do not broaden scope into general observability dashboards, chat transcript redesign, or role-management refactors.

### Missing Inputs / Context Notes

- No `project-context.md` file was found during discovery.
- No dedicated UX artifact was found for the audit dashboard; use existing admin page structure as the visual constraint until a UX doc exists.
- The implementation-readiness report notes a broader planning gap around initial DB/table creation timing. Story 4.1 already addressed the audit table path in this repo, so Story 4.2 should build on the existing schema rather than recreate it. [Source: `_bmad-output/planning-artifacts/implementation-readiness-report-2026-03-22.md:130`]

### References

- `AGENTS.md`
- `be/AGENTS.md`
- `_bmad-output/planning-artifacts/epics.md:99`
- `_bmad-output/planning-artifacts/prd.md:69`
- `_bmad-output/planning-artifacts/prd.md:127`
- `_bmad-output/planning-artifacts/architecture.md:47`
- `_bmad-output/planning-artifacts/architecture.md:174`
- `_bmad-output/planning-artifacts/implementation-readiness-report-2026-03-22.md:104`
- `_bmad-output/planning-artifacts/implementation-readiness-report-2026-03-22.md:130`
- `_bmad-output/implementation-artifacts/4-1-append-only-audit-tailing-logger.md:35`
- `_bmad-output/implementation-artifacts/4-1-append-only-audit-tailing-logger.md:96`
- `be/prisma/schema.prisma:565`
- `be/src/modules/users/users.controller.ts:7`
- `be/src/modules/users/users.service.ts:8`
- `fe/src/router.jsx:27`
- `fe/src/components/AdminRoute.jsx:4`
- `fe/src/pages/RoleManagementPage.jsx:83`
- `fe/src/App.css:217`
- `fe/src/services/apiClient.js:4`
- `fe/src/main.jsx:3`

## Dev Agent Record

### Agent Model Used

gpt-5.4

### Debug Log References

- Story selected automatically from `_bmad-output/implementation-artifacts/sprint-status.yaml` as the first backlog item in read order.
- Epic 4 and FR12 analysis confirmed this is a security investigation surface, not a generic analytics page.
- Previous Story 4.1 established append-only audit data, denial-path logging, and null-FK behavior that the dashboard must respect.
- Repo inspection confirmed an existing admin route pattern in `fe/src/router.jsx`, a reusable admin shell in `fe/src/pages/RoleManagementPage.jsx`, and standardized frontend data fetching through TanStack Query plus `apiClient`.
- Schema inspection confirmed `tool_call_logs` already contains the read-side columns needed for investigation and has indexes appropriate for trace, date, tool, and user-oriented filtering.
- Validation pass removed speculative UX flourishes and kept the story focused on a simple admin dashboard aligned with existing project patterns because no dedicated UX spec exists yet.
- Converted sprint status from `ready-for-dev` to `in-progress` before implementation and added a new backend `audit` module plus frontend `AuditLogsPage` route/service.
- Fixed a real frontend/backend contract mismatch during verification by aligning the frontend query params to the backend DTO (`pageSize`, `tool`, `dateFrom`, `dateTo`) and reading pagination from `data.pagination`.
- Backend verification was expanded after Oracle review to cover successful rows, validation-pipe coercion, filters, pagination metadata, admin authorization, and exact stored-scope detail mapping.
- Frontend verification gap was closed by approved test-tooling setup with Vitest + Testing Library, then focused tests were added for admin-route protection, loading/error states, filter submission, and detail scope rendering.
- Final verification completed with `fe` test/lint/build green, `be` audit suite green, `be` full suite green, and `be` build green.

### Completion Notes List

- Added admin-only backend audit APIs at `/api/audit-logs` and `/api/audit-logs/:id` using a dedicated `audit` module with DTO-backed query validation and repo-standard wrapped responses.
- Implemented audit-log query and mapping logic over `tool_call_logs`, including filters for user/date/tool/success/trace, pagination metadata, null-FK fallback labels, and exact stored token-scope detail reads.
- Added the `admin/audit-logs` frontend route, `AuditLogsPage`, and `auditService`, reusing the existing admin shell and investigation-safe UI patterns for denied and partially trusted rows.
- Aligned frontend request/response handling to the backend contract after catching an integration mismatch during verification.
- Added backend automated coverage for filters, pagination, success + denied detail paths, and admin guard behavior.
- Added frontend automated coverage with Vitest + Testing Library for admin-route protection, loading/error states, filter submission, and detail scope rendering.
- Verified the completed story with `npm test`, `npm run lint`, and `npm run build` in `fe/`, plus `npm test -- --runInBand audit`, full `npm test -- --runInBand`, and `npm run build` in `be/`.

### File List

- `be/src/app.module.ts`
- `be/src/modules/audit/audit.controller.ts`
- `be/src/modules/audit/audit.controller.spec.ts`
- `be/src/modules/audit/audit.module.ts`
- `be/src/modules/audit/audit.service.ts`
- `be/src/modules/audit/audit.service.spec.ts`
- `be/src/modules/audit/dto/list-audit-logs-query.dto.ts`
- `be/src/tests/integration/audit.controller.spec.ts`
- `fe/package-lock.json`
- `fe/package.json`
- `fe/src/App.css`
- `fe/src/components/AdminRoute.test.jsx`
- `fe/src/pages/AuditLogsPage.jsx`
- `fe/src/pages/AuditLogsPage.test.jsx`
- `fe/src/services/auditService.js`
- `fe/src/test/setup.js`
- `fe/src/router.jsx`
- `fe/vite.config.js`
- `_bmad-output/implementation-artifacts/4-2-security-investigation-dashboard.md`

## Change Log

- `2026-03-22`: Created the comprehensive ready-for-dev story context for the Security Investigation Dashboard.
- `2026-03-22`: Implemented the security investigation dashboard across backend and frontend, added backend + frontend automated verification, and moved the story to review.
