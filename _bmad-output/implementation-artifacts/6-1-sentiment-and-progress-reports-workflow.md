# Story 6.1: Sentiment & Progress Reports Workflow

Status: review

## Story

As a Manager,
I want to ask the AI for aggregated reports on my department's training progress and pulse (sentiment),
so that I can adjust strategy without opening Excel files.

## Acceptance Criteria

1. **Given** a Manager is in the chat
2. **When** they ask `"Bao cao tien do dao tao phong Dev thang nay"`
3. **Then** the `training_analytics_agent` gets the data via Internal API
4. **And** the UI must render a Summary Card with at least two metrics: `% Completion Rate` and a sentiment summary expressed as either a categorical breakdown (`positive` / `neutral` / `negative`) or a clearly named numeric metric already backed by the repo contract
5. **And** the request must remain inside the backend-controlled trust boundary, with Backend enforcing RBAC, scoped internal-tool access, and traceability metadata for the analytics flow
6. **And** failures in analytics retrieval or AI orchestration must degrade gracefully with the repo-standard wrapped error response and chat-safe feedback rather than exposing raw backend errors

## Tasks / Subtasks

- [x] Task 1: Expose the analytics read path for manager report requests (AC: 1, 3, 5, 6)
  - [x] Add or extend backend analytics services under `be/src/modules/analytics/` to aggregate department-level training progress and sentiment using the existing backend service layer rather than controller-side queries.
  - [x] Provide or reuse the required internal tool contract for `training_analytics_agent` using one canonical analytics route/tool mapping everywhere in the implementation; if the repo follows the system-level contract, prefer the `/internal/tools/analytics/training/department` family and the matching analytics tool name instead of inventing a parallel route.
  - [x] Reuse existing analytics/report endpoints where possible instead of creating duplicate aggregation logic for the same metrics.
  - [x] Ensure the read path carries `traceId`, `conversationId`, `userId`, `agentGroup`, and tool metadata through the request lifecycle.
  - [x] Keep the tool allowlist least-privilege: update only the analytics tools needed for this story in backend tool mapping / `agent_group_tools` and the OpenClaw analytics-agent tool configuration instead of broadly enabling reporting capabilities.

- [x] Task 2: Implement the manager-facing report contract and aggregation mapping (AC: 3, 4, 5)
  - [x] Return a stable analytics payload that includes at minimum completion rate, a sentiment breakdown or other repo-backed sentiment field, target department context, and the reporting period.
  - [x] Derive progress metrics from training progress sources (`user_courses`, `quiz_attempts`, optional `analytics_snapshots`) and sentiment metrics from `training_feedback` / report summaries instead of inventing new storage.
  - [x] Resolve department scope from backend-authorized manager context; never trust a raw department name or `departmentId` coming from the prompt, frontend payload, or unconstrained tool parameters without ownership validation.
  - [x] Keep JSON properties in `camelCase` and API responses in the repo-standard wrapper shape.
  - [x] If the analytics agent also supports generated report files, keep `reports` / `generated/analytics/reports/*` as outputs of backend-controlled report generation, not as the source of truth for Summary Card data.

- [x] Task 3: Render the chat-side Summary Card for analytics outcomes (AC: 2, 4, 6)
  - [x] Extend the frontend chat rendering path so analytics responses can produce a structured Summary Card instead of plain text-only output.
  - [x] Display at least completion rate and average sentiment in a compact, scannable card that matches the existing chat/admin visual language instead of inventing a separate dashboard system.
  - [x] Handle loading, empty, and failure states safely so the chat does not stall or render broken placeholders.
  - [x] Keep the interaction inside the normal `Frontend -> Backend -> OpenClaw -> Tool -> Backend` flow; the frontend must never call OpenClaw or internal-tool APIs directly.

- [x] Task 4: Preserve access control and zero-trust analytics boundaries (AC: 1, 3, 5)
  - [x] Restrict this workflow to Manager / analytics-authorized users through backend RBAC and agent-access checks before the request reaches `training_analytics_agent`.
  - [x] Do not let `training_analytics_agent` query the database directly or read cross-department data outside the backend-approved scope.
  - [x] Keep external APIs and internal tool APIs separated by prefix and auth mechanism.
  - [x] Avoid hardcoding permissions in controllers; use guards / policy services / access evaluators following backend conventions.
  - [x] If orchestration or token plumbing is touched, reuse `internal_scoped_token` with the PRD maximum TTL of 5 minutes and do not create a long-lived analytics-specific token.

- [x] Task 5: Verify analytics correctness, performance, and user-visible behavior (AC: 3, 4, 5, 6)
  - [x] Add backend tests for aggregation logic, authorization, response wrapping, and internal-tool access rules.
  - [x] Add frontend tests for Summary Card rendering and error/empty handling in the chat flow.
  - [x] Validate at least one successful manager report request and one denied / unsupported request path.
  - [x] Verify the implementation against the repo performance constraints: TTFT under 3 seconds for first chat output, internal-tool execution under 2 seconds where practical, and graceful error messaging within 5 seconds.

## Dev Notes

### Story Intent

Story 6.1 is the first implementation slice of Epic 6 and establishes the chat-based management analytics workflow for department-level training visibility. The goal is not a standalone dashboard or raw export pipeline; it is a backend-controlled AI workflow where a Manager asks for a report in chat, the `training_analytics_agent` gathers approved analytics through internal tools, and the frontend renders a compact Summary Card that surfaces the most decision-relevant metrics quickly.

### Epic and Product Context

- Epic 6 exists to provide managers with AI-accessible summaries of employee sentiment and training progress at branch or department level. [Source: `_bmad-output/planning-artifacts/epics.md:262`]
- Story 6.1 specifically targets a manager asking for a monthly department training report and expects the `training_analytics_agent` plus a Summary Card UI response. [Source: `_bmad-output/planning-artifacts/epics.md:264`]
- PRD FR15 defines this capability as a Growth-phase requirement for managers to obtain training-progress and sentiment reporting. [Source: `_bmad-output/planning-artifacts/prd.md:132`]
- PRD user journey 3 describes a manager using `training_analytics_agent` to analyze and summarize feedback, with output suitable for Markdown/PDF in under 10 seconds. [Source: `_bmad-output/planning-artifacts/prd.md:66`]

### Current Codebase Intelligence

- The backend architecture already reserves `be/src/modules/analytics/` for progress analytics, feedback, reports, and KPI snapshots, making it the canonical module for Story 6.1 business logic. [Source: `be/AGENTS.md:171`; `_bmad-output/planning-artifacts/architecture.md:237`]
- The system already defines analytics-facing external APIs and internal analytics tool paths, but the docs are not perfectly aligned on naming. The implementation must choose one canonical internal contract and use it consistently across backend route registration, tool mapping, and analytics-agent usage; Story 6.1 should extend or compose those patterns rather than inventing a parallel reporting stack. [Source: `AGENTS.md`; `be/docs/api/API_SPEC.md:1129`; `be/docs/api/API_SPEC.md:1529`]
- Story 4.2 is the closest repo precedent for a read-only reporting surface: it shows how backend data flows, response wrappers, null-safe rendering, and focused UI constraints are documented when no dedicated UX spec exists. Reuse its scannable, investigation-first mindset for analytics cards and avoid broad dashboard scope creep. [Source: `_bmad-output/implementation-artifacts/4-2-security-investigation-dashboard.md:53`]
- Story 4.1 is the strongest precedent for traceability and security-grade backend behavior. The analytics flow should preserve the same `traceId` / `conversationId` discipline and backend-owned data access boundaries. [Source: `_bmad-output/implementation-artifacts/4-1-append-only-audit-tailing-logger.md:53`]

### Data Contract and Reporting Inputs

- `user_courses` is the primary progress source for per-user training completion status and progress state. [Source: `be/docs/db/project_openclaw_backend_schema_for_agent.md:348`]
- `quiz_attempts` holds submitted answers, scores, and completion timing that can support richer progress calculations when relevant. [Source: `be/docs/db/project_openclaw_backend_schema_for_agent.md:375`]
- `training_feedback` stores rating, comment, sentiment label, and topics JSON and is the canonical source for sentiment-oriented reporting. [Source: `be/docs/db/project_openclaw_backend_schema_for_agent.md:393`]
- `reports` stores generated report metadata and summary JSON, while `analytics_snapshots` stores daily or department KPI snapshots for quick dashboard-style reads. These are supporting analytics assets, not permission-bypassing shortcuts around backend services. [Source: `be/docs/db/project_openclaw_backend_schema_for_agent.md:402`; `be/docs/db/project_openclaw_backend_schema_for_agent.md:412`]
- The existing analytics API spec already defines department analytics and feedback/report endpoints plus canonical field names like `completionRate`, `averageScore`, `satisfactionScore`, `sentimentLabel`, `sentimentBreakdown`, and report types such as `department_summary`. Do not invent a mixed metric such as an "average sentiment score" with categorical values; use either categorical sentiment fields/breakdown or a clearly numeric metric with a separate name. [Source: `be/docs/api/API_SPEC.md:1193`; `be/docs/api/API_SPEC.md:1256`; `be/docs/api/API_SPEC.md:1297`; `be/docs/api/API_SPEC.md:1334`]

### Architecture Compliance

- Backend remains the security boundary. The Manager-facing chat request must still follow `Frontend -> Backend -> OpenClaw -> Tool -> Backend Internal API -> Service -> DB/Data`, with no direct frontend-to-OpenClaw or agent-to-DB bypass. [Source: `AGENTS.md`; `_bmad-output/planning-artifacts/architecture.md:252`]
- Internal analytics tool APIs must stay under `/internal/tools/analytics/*`, require `internal_scoped_token`, and validate agent, scope, and user context independently of the external chat request. [Source: `be/AGENTS.md:292`; `be/docs/api/API_SPEC.md:1441`]
- Department-level report scope must be enforced by backend ownership rules derived from the authenticated manager context. The implementation must not trust a raw prompted department name or free-form `departmentId` unless backend authorization confirms that scope is allowed for the requester. [Source: `AGENTS.md`; `be/AGENTS.md:301`; `_bmad-output/planning-artifacts/prd.md:106`]
- Controllers should stay thin and must not contain direct DB queries or hardcoded permission rules. Business aggregation belongs in analytics services / repositories. [Source: `be/AGENTS.md:51`; `be/docs/api/API_SPEC.md:1804`]
- API responses should use the standard wrapper with `success`, `data`, and `meta`, and error paths should preserve standardized error codes/messages instead of leaking raw exceptions. [Source: `be/docs/api/API_SPEC.md:82`; `_bmad-output/planning-artifacts/architecture.md:174`]
- Security and performance constraints still apply in this Growth-phase story: short-lived internal tokens (max TTL 5 minutes), traceability, internal-tool latency targets, retry discipline, and graceful degradation are non-optional. [Source: `_bmad-output/planning-artifacts/prd.md:139`; `_bmad-output/planning-artifacts/architecture.md:36`]

### Frontend and UX Guidance

- The acceptance criteria require a Summary Card rendered in the chat experience, not a separate analytics dashboard. Keep the implementation inside the existing chat rendering pipeline used for structured tool outcomes. [Source: `_bmad-output/planning-artifacts/epics.md:267`; `_bmad-output/planning-artifacts/epics.md:213`]
- No dedicated UX document exists. The implementation-readiness report explicitly warns against inventing free-form UX, so the frontend should stay simple, readable, and consistent with the current project patterns (React + Vite, Tailwind CSS v4, Radix/Shadcn UI primitives). [Source: `_bmad-output/planning-artifacts/implementation-readiness-report-2026-03-22.md:104`; `_bmad-output/planning-artifacts/epics.md:63`; `_bmad-output/planning-artifacts/architecture.md:136`]
- Because the product already uses SSE chat streaming, the Summary Card path should tolerate partial AI output and structured payload delivery without blocking the first visible response token. [Source: `_bmad-output/planning-artifacts/epics.md:55`; `_bmad-output/planning-artifacts/architecture.md:131`]

### File Structure Requirements

- Backend files likely involved:
  - `be/src/modules/analytics/*`
  - `be/src/modules/agent-router/*`
  - `be/src/modules/chat/*`
  - `be/src/modules/openclaw/*`
  - `be/src/modules/tool-gateway/*`
  - `be/src/modules/auth/*`
- Frontend files likely involved:
  - `fe/src/features/chat/*`
  - `fe/src/components/*` for a focused Summary Card if the existing chat message renderer would become too large
  - `fe/src/services/*` or existing chat service modules for structured analytics payload handling
  - `fe/src/store/*` / chat state if structured card payloads need typed storage or parsing hooks
- AI engine files likely involved:
  - `openclaw/agents/analytics_agent.py` or the repo-equivalent analytics agent definition
  - analytics tool allowlist / tool mapping configuration

### Testing Requirements

- Add backend coverage for manager authorization, internal analytics tool access, aggregation correctness, wrapped success/error responses, and traceability metadata propagation.
- Add frontend coverage proving a structured analytics response renders the Summary Card with at least completion rate and sentiment output in the chat flow.
- Verify one denied path where a non-manager or unauthorized user cannot trigger the analytics workflow.
- Verify one failure path where upstream analytics retrieval or AI/tool execution degrades gracefully instead of freezing chat.
- If report generation is reused, ensure generated files are validated as outputs only and do not replace the live backend aggregation source for the Summary Card.

### Scope Boundaries

- This story is about the end-to-end analytics chat workflow, not a full management dashboard, export center, or warehouse redesign.
- Do not broaden scope into generalized BI features, cross-tenant analytics, or unrestricted historical exploration.
- Do not move analytics source-of-truth data into `generated/` files or let generated reports become the primary read model.
- Do not weaken RBAC or internal-tool isolation just to make the analytics flow easier to implement.

### Missing Inputs / Context Notes

- No dedicated UX document was found for Story 6.1 or Epic 6. [Source: `_bmad-output/planning-artifacts/implementation-readiness-report-2026-03-22.md:24`]
- No `project-context.md` file was found during discovery.
- The broader planning set still contains known readiness gaps around initial setup stories and UX specificity, so implementation should prefer established repo patterns over invention when details are under-specified. [Source: `_bmad-output/planning-artifacts/implementation-readiness-report-2026-03-22.md:141`]

### References

- `AGENTS.md`
- `be/AGENTS.md`
- `be/docs/api/API_SPEC.md`
- `be/docs/db/project_openclaw_backend_schema_for_agent.md`
- `_bmad-output/planning-artifacts/epics.md`
- `_bmad-output/planning-artifacts/prd.md`
- `_bmad-output/planning-artifacts/architecture.md`
- `_bmad-output/planning-artifacts/implementation-readiness-report-2026-03-22.md`
- `_bmad-output/implementation-artifacts/4-1-append-only-audit-tailing-logger.md`
- `_bmad-output/implementation-artifacts/4-2-security-investigation-dashboard.md`

## Dev Agent Record

### Agent Model Used

gpt-5.4

### Debug Log References

- Story selected automatically from `_bmad-output/implementation-artifacts/sprint-status.yaml` as the first backlog item in read order.
- Epic 6 analysis confirmed that Story 6.1 is the first story in the epic, so sprint tracking must move `epic-6` from `backlog` to `in-progress` when the story file is created.
- Planning artifacts confirmed the required user-visible outcome is a chat Summary Card, not a separate dashboard or export workflow.
- Repo analysis found existing analytics endpoints and data tables (`user_courses`, `quiz_attempts`, `training_feedback`, `reports`, `analytics_snapshots`) that should be composed instead of recreated.
- Cross-epic learnings from Stories 4.1 and 4.2 were reused to make traceability, wrapped responses, null-safe rendering, and backend-controlled read paths explicit.
- No dedicated UX artifact was available, so the story constrains frontend work to existing project visual patterns and avoids speculative UI invention.
- Oracle review tightened the story by making department authorization explicit, forcing one canonical internal analytics route/tool contract, and removing the ambiguous mixed sentiment metric language.
- Implemented the backend analytics groundwork under `be/src/modules/analytics/` with a guarded internal tool route, service-layer department aggregation, and focused backend tests.
- Implemented frontend analytics summary payload normalization plus a chat Summary Card renderer and tests under `fe/src/services/` and `fe/src/pages/`.
- Added a thin `be/src/modules/openclaw/` client path, scoped internal-token minting in `ChatService`, and analytics-only OpenClaw request wiring so manager analytics prompts now flow through `Backend -> OpenClaw -> Tool -> Internal API` instead of the previous hard fallback branch.
- Added backend orchestration tests plus a frontend streamed Summary Card test to prove both the success path and graceful fallback path without changing the existing analytics card runtime contract.
- Full verification passed with `npm test` and `npm run build` in `be/`, plus `npm run lint`, `npm test`, and `npm run build` in `fe/`.

### Completion Notes List

- Created a ready-for-dev story context for the manager analytics workflow in chat.
- Added explicit guardrails for internal analytics tool access, backend-controlled aggregation, Summary Card rendering, and traceability.
- Anchored the story to existing analytics tables, API contracts, and cross-epic reporting/audit precedents to reduce implementation guesswork.
- Documented scope boundaries so the dev agent does not drift into dashboard redesign, unrestricted exports, or source-of-truth violations.
- Added `GET /internal/tools/analytics/training/department`, `AnalyticsService`, and backend tests covering manager access, wrapped responses, and graceful failures.
- Added frontend support for `analytics-summary` payload normalization, persisted-message rehydration, and compact Summary Card rendering in chat.
- Added OpenClaw client wiring under `be/src/modules/openclaw/`, minted least-privilege `read:analytics` internal tokens in the chat orchestration path, and persisted analytics assistant metadata with `traceId` and `agentName`.
- Replaced the analytics hard-fallback branch in `be/src/modules/chat/chat.service.ts` with an OpenClaw-backed request for analytics prompts while preserving a chat-safe fallback when orchestration is unavailable.
- Added backend tests for OpenClaw request shaping and analytics chat success/fallback behavior, plus a frontend streamed Summary Card test, and verified the full backend/frontend suites and builds all pass.

### File List

- `_bmad-output/implementation-artifacts/6-1-sentiment-and-progress-reports-workflow.md`
- `be/src/modules/analytics/analytics.module.ts`
- `be/src/modules/analytics/analytics.internal.controller.ts`
- `be/src/modules/analytics/analytics.service.ts`
- `be/src/modules/analytics/analytics.service.spec.ts`
- `be/src/modules/chat/chat.module.ts`
- `be/src/modules/chat/chat.service.ts`
- `be/src/modules/chat/chat.service.spec.ts`
- `be/src/modules/openclaw/openclaw.module.ts`
- `be/src/modules/openclaw/openclaw.service.ts`
- `be/src/modules/openclaw/openclaw.service.spec.ts`
- `be/src/tests/integration/analytics.internal.controller.spec.ts`
- `fe/src/App.css`
- `fe/src/pages/ChatDashboardPage.jsx`
- `fe/src/pages/ChatDashboardPage.test.jsx`
- `fe/src/services/chatService.js`
- `fe/src/services/chatService.test.js`

## Change Log

- `2026-03-23`: Created the comprehensive ready-for-dev story context for Story 6.1.
- `2026-03-23`: Implemented backend analytics internal-tool groundwork, frontend analytics summary card support, and documented the remaining OpenClaw orchestration blocker.
- `2026-03-23`: Added analytics OpenClaw orchestration wiring, analytics chat success/fallback tests, and streamed Summary Card verification; story is ready for review.
