# Story 3.2: Onboarding Tasks Internal API (Cau noi Nghiep vu)

Status: review

## Story

As a New Hire,
I want my specific onboarding checklist to be securely accessible via an API,
so that the AI Engine can accurately read my progress and mark tasks as complete on my behalf.

## Acceptance Criteria

1. **Given** an employee already has checklist assignments in `user_onboarding_tasks`
2. **When** the OpenClaw onboarding tool calls `GET /internal/tools/onboarding/me/checklist` with a valid `internal_scoped_token`
3. **Then** the backend must return only the pending checklist items that belong to the exact `userId` from the verified token
4. **And** the response must use a safe camelCase payload with deterministic ordering suitable for the agent, not raw Prisma rows
5. **Given** the onboarding tool calls `POST /internal/tools/onboarding/me/checklist/:taskId/complete` for a checklist item owned by that same token user
6. **When** `taskId` is a valid `onboarding_tasks.id` UUID and the checklist record exists for that token user
7. **Then** the backend must update the matching `user_onboarding_tasks` record to `status = completed`, set `completed_at`, and return the updated completion payload
8. **And** the completion route must be idempotent: if the checklist item is already completed, it returns the current completed state without resetting `completed_at`
9. **And** requests for a task that does not belong to the token user must follow the same not-found path as an unknown task so the API does not leak cross-user task existence

## Tasks / Subtasks

- [x] Task 1: Extend the onboarding internal controller for checklist read and completion flows (AC: 1, 2, 5)
  - [x] Update `be/src/modules/onboarding/onboarding.internal.controller.ts` to expose `GET /internal/tools/onboarding/me/checklist` and `POST /internal/tools/onboarding/me/checklist/:taskId/complete`.
  - [x] Keep both routes under the existing internal namespace only; do not add external `/api/*` or `/me/*` routes in this story.
  - [x] Protect the read route with `@UseGuards(InternalAgentGuard)` and `@AgentScope('read:checklist')`.
  - [x] Protect the completion route with `@UseGuards(InternalAgentGuard)` and `@AgentScope('write:checklist')` so the mutation does not reuse a read-only scope.
  - [x] Validate `taskId` as a UUID before service logic runs and keep the controller thin.

- [x] Task 2: Implement checklist query logic in the onboarding service (AC: 1, 2, 3, 4)
  - [x] Add a Prisma-backed service method that derives `userId` from `request.internalAgent.userId` at the controller boundary and queries `user_onboarding_tasks` joined to `onboarding_tasks`.
  - [x] Filter to the token user's checklist items with `status = pending` only.
  - [x] Order results deterministically by `onboarding_tasks.order_no` ascending, then `onboarding_tasks.task_name` ascending.
  - [x] Return only safe agent-facing fields such as `taskId`, `taskName`, `description`, `status`, `dueDay`, `required`, and `orderNo`.
  - [x] Do not expose raw foreign keys, assignment metadata, timestamps unrelated to the agent flow, or free-form internal notes in the checklist read payload.

- [x] Task 3: Implement checklist completion with strict ownership enforcement (AC: 5, 6, 7, 8, 9)
  - [x] Add a service method that updates `user_onboarding_tasks` by the composite of `user_id` and `onboarding_task_id`, never by `taskId` alone.
  - [x] Treat `taskId` as the UUID from `onboarding_tasks.id`; do not model it as a numeric ID and do not confuse it with `user_onboarding_tasks.id`.
  - [x] When a matching pending record exists, set `status` to `completed`, persist `completed_at`, and optionally store the incoming completion note in `notes`.
  - [x] When the matching record is already completed, return the current completed state without changing `completed_at`.
  - [x] When no matching record exists for the token user, throw a single not-found path that does not reveal whether the task exists for another user.

- [x] Task 4: Preserve backend contracts for security, tracing, and responses (AC: 2, 4, 7, 9)
  - [x] Reuse the existing `InternalAgentGuard`, which already validates bearer token, optional identity headers, and any `userId` or `conversationId` values carried by params, query, or body.
  - [x] Keep response shaping delegated to the global `SuccessResponseInterceptor` and `HttpExceptionFilter`; do not hand-roll wrappers in the controller.
  - [x] Preserve traceability through the existing `X-Trace-Id`, `X-Agent-Name`, `X-User-Id`, and `X-Conversation-Id` flow.
  - [x] If the current internal token issuance path does not yet include `write:checklist`, extend that contract narrowly rather than weakening the checklist completion guard.

- [x] Task 5: Add focused automated tests for checklist ownership and mutation behavior (AC: 3, 4, 7, 8, 9)
  - [x] Extend `be/src/modules/onboarding/onboarding.internal.controller.spec.ts` to verify route metadata, guard protection, scope metadata, UUID param handling, and delegation to service methods.
  - [x] Add or extend `be/src/modules/onboarding/onboarding.service.spec.ts` to cover token-user-only filtering, deterministic ordering, safe field mapping, successful completion, already-completed idempotency, and the unified not-found path.
  - [x] Mock Prisma interactions instead of adding broad end-to-end scaffolding.

- [x] Task 6: Keep scope narrow and aligned with adjacent stories
  - [x] Do not implement FAQ/contact endpoints again; Story 3.1 already owns those reads.
  - [x] Do not implement frontend checklist cards, chat rendering, OpenClaw tool-definition files, external user-facing endpoints, or unrelated onboarding refactors.
  - [x] Do not read from `generated/` or Markdown files as a source of truth when checklist state already lives in PostgreSQL.

## Dev Notes

### Story Intent

Story 3.2 is the checklist counterpart to Story 3.1. The goal is to let `onboarding_assistant` read and complete onboarding tasks through the backend security boundary instead of inventing task state inside the agent or reading from generated context files.

### Current Codebase Intelligence

- `be/src/modules/onboarding/onboarding.internal.controller.ts` already exposes internal onboarding reads for FAQ and support contacts under `internal/tools/onboarding`.
- `be/src/modules/onboarding/onboarding.service.ts` already establishes the local pattern: thin controller, Prisma access in service, explicit payload mapping, and camelCase output.
- `be/src/modules/auth/guards/internal-agent.guard.ts` already verifies the internal bearer token, scope membership, optional ownership headers, and any user or conversation IDs that appear in params, query, or body.
- `be/src/common/interceptors/success-response.interceptor.ts` and `be/src/common/filters/http-exception.filter.ts` already enforce the standard `{ success, data, meta.traceId }` and `{ success: false, error, meta.traceId }` envelopes.
- Recent git history is dominated by story-document commits, so the strongest implementation signals come from the live backend code and schema rather than commit diffs.

### Architecture Compliance

- Keep the boundary `OpenClaw -> Tool -> Backend Internal API -> Service -> Prisma -> PostgreSQL`.
- Keep all work inside `be/src/modules/onboarding/` unless a narrow auth dependency is required to issue `write:checklist`.
- Do not mix internal routes with external `/api/*` or `/me/*` routes in this story.
- The backend remains the sole security boundary; the agent must not infer ownership, permissions, or completion rights on its own.

### Data Contract Notes

- Relevant Prisma models and fields from `be/prisma/schema.prisma`:
  - `onboarding_tasks`: `id`, `plan_id`, `code`, `task_name`, `description`, `order_no`, `due_day`, `required`
  - `user_onboarding_tasks`: `user_id`, `onboarding_task_id`, `status`, `completed_at`, `notes`, unique on `[user_id, onboarding_task_id]`
  - `onboarding_plans`: the template plan that owns `onboarding_tasks`; only join it if needed for an explicit active-plan constraint
- The live schema uses UUID strings, so `taskId` must be treated as a UUID string everywhere in DTOs, tests, and story examples.
- The strongest response contract in `be/docs/api/API_SPEC.md` uses `status: "completed"` and `completedAt`, so this story should standardize on `completed` rather than `done` or `Done`.

### Scope and Ownership Guardrails

- Read access for checklist retrieval should require `read:checklist`.
- Completion is a mutation and should require `write:checklist`; do not silently reuse a read-only scope for POST.
- The service must derive the acting user from the verified internal agent payload and update by both `user_id` and `onboarding_task_id`.
- The `:taskId` route must not allow cross-user writes by updating records through `onboarding_task_id` alone.
- Missing checklist item and other-user checklist item must collapse into the same not-found behavior.

### Implementation Guardrails

- Reuse the existing onboarding module/controller/service instead of creating a second onboarding controller stack.
- Keep controller logic limited to request extraction, param validation, and service delegation.
- Use Prisma through `OnboardingService`; do not query the database directly from the controller.
- Do not return raw Prisma rows or internal-only fields.
- Keep GET scoped to pending tasks only unless a future story explicitly expands the checklist view.
- Keep POST idempotent and preserve the original `completedAt` value on repeated completion requests.
- If a completion note payload is supported, keep it optional and narrow; do not introduce broad edit semantics.

### File Structure Requirements

- Update:
  - `be/src/modules/onboarding/onboarding.internal.controller.ts`
  - `be/src/modules/onboarding/onboarding.service.ts`
  - `be/src/modules/onboarding/onboarding.internal.controller.spec.ts`
  - `be/src/modules/onboarding/onboarding.service.spec.ts`
- Optional only if the implementation benefits from stronger request typing:
  - `be/src/modules/onboarding/dto/*.ts`
- Only if required by the existing auth/token issuance flow for mutation scope support:
  - the narrow auth module files that define internal token scopes for onboarding checklist completion

### Testing Requirements

- Controller tests should verify:
  - route path and method metadata for `me/checklist` and `me/checklist/:taskId/complete`
  - guard protection and scope metadata for both routes
  - UUID validation behavior for `taskId`
  - controller delegation to service methods
- Service tests should verify:
  - only the token user's pending tasks are returned
  - results are ordered by `orderNo`, then `taskName`
  - the checklist payload maps to the safe camelCase shape
  - completion updates only the matching `[user_id, onboarding_task_id]` record
  - repeated completion is idempotent and preserves `completedAt`
  - other-user or missing task access follows the same not-found path

### Previous Story Intelligence

- Story 3.1 already established the exact internal namespace, controller/service split, and testing style this story should extend.
- Story 3.1 also made a strong rule against inventing new response wrappers, bypassing `InternalAgentGuard`, or using Markdown/generated artifacts as data sources; Story 3.2 should preserve those same boundaries.
- This epic is intentionally being delivered in small backend slices. Keep Story 3.2 focused on checklist read/completion only so Story 3.3 can own the UI rendering layer cleanly.

### Git / Workspace Notes

- Recent commit titles:
  - `ac108f8 Add onboarding internal API story`
  - `81f7719 Add BMAD skills library and manifests`
  - `b713b37 Add formatted project plan document`
- Because the latest epic work in git is mostly story scaffolding, prefer the live TypeScript module structure and Prisma schema over historical commit assumptions.

### References

- `AGENTS.md`
- `be/AGENTS.md`
- `_bmad-output/planning-artifacts/epics.md`
- `_bmad-output/planning-artifacts/prd.md`
- `_bmad-output/planning-artifacts/architecture.md`
- `_bmad-output/implementation-artifacts/3-1-support-directory-and-faq-internal-api-cau-noi-kien-thuc.md`
- `be/src/modules/onboarding/onboarding.module.ts`
- `be/src/modules/onboarding/onboarding.internal.controller.ts`
- `be/src/modules/onboarding/onboarding.service.ts`
- `be/src/modules/onboarding/onboarding.internal.controller.spec.ts`
- `be/src/modules/auth/guards/internal-agent.guard.ts`
- `be/src/modules/auth/internal-token.service.ts`
- `be/src/common/interceptors/success-response.interceptor.ts`
- `be/src/common/filters/http-exception.filter.ts`
- `be/prisma/schema.prisma`
- `be/docs/api/API_SPEC.md`
- `be/docs/architecture/backend-architecture.md`
- `be/docs/db/project_openclaw_backend_schema_for_agent.md`
- `PLAN.md`
- `system-workflow-architecture.md`

## Dev Agent Record

### Agent Model Used

openai/gpt-5.4

### Debug Log References

- Story selected automatically from `_bmad-output/implementation-artifacts/sprint-status.yaml` as the first backlog item in read order.
- Story context synthesized from Epic 3, PRD onboarding requirements, architecture rules, the live onboarding module, Prisma schema, API spec examples, Story 3.1 context, and an Oracle review.
- Added `GET /internal/tools/onboarding/me/checklist` and `POST /internal/tools/onboarding/me/checklist/:taskId/complete` to the existing onboarding internal controller with `read:checklist` and `write:checklist` guard scopes.
- Added a narrow DTO for optional completion notes and route-level UUID parsing with `ParseUUIDPipe`.
- Implemented `OnboardingService.getChecklistItems()` and `OnboardingService.completeChecklistTask()` using Prisma reads and composite-key ownership-safe updates on `user_onboarding_tasks`.
- Confirmed no active `InternalTokenService.createToken(...)` call site exists in `be/src`, so no backend token issuance code change was available in this slice; the endpoint guard remains strict and future issuance wiring must include `write:checklist`.
- Validation executed: targeted onboarding tests, full backend Jest suite (`61/61`), and `nest build` all passed.

### Completion Notes List

- Story context finalized for checklist retrieval and checklist completion through the backend internal API.
- Read and mutation scope expectations are explicit so the implementation does not blur read-only and write behavior.
- Ownership, UUID semantics, response shape, and idempotent completion rules are pinned to reduce cross-user update risk.
- Implemented internal checklist retrieval with deterministic ordering and safe camelCase payload mapping for pending tasks only.
- Implemented idempotent checklist completion that updates only the matching `[user_id, onboarding_task_id]` record and returns the existing completed state on repeat requests.
- Added focused unit tests for controller route metadata/delegation and service-level ownership, completion, and not-found behavior.
- Full backend regression suite and production build passed after the change.

### File List

- `_bmad-output/implementation-artifacts/3-2-onboarding-tasks-internal-api-cau-noi-nghiep-vu.md`
- `be/src/modules/onboarding/dto/complete-checklist-task.dto.ts`
- `be/src/modules/onboarding/onboarding.internal.controller.ts`
- `be/src/modules/onboarding/onboarding.internal.controller.spec.ts`
- `be/src/modules/onboarding/onboarding.service.ts`
- `be/src/modules/onboarding/onboarding.service.spec.ts`

## Change Log

- `2026-03-22`: Created the comprehensive ready-for-dev story context for onboarding checklist internal read/completion APIs.
- `2026-03-22`: Implemented onboarding checklist internal read/completion endpoints, added ownership-safe Prisma logic, and verified the backend test suite plus production build.
