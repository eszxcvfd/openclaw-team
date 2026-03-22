# Story 3.1: Support Directory & FAQ Internal API (Cầu nối Kiến thức)

Status: ready-for-dev

## Story

As a Backend Developer,
I want to build dedicated Internal APIs that fetch FAQs and support contact directories,
so that the AI Engine can query this ground-truth data cleanly using its Tool Call capabilities.

## Acceptance Criteria

1. **Given** the OpenClaw Engine recognizes an intent to look up an IT contact or policy
2. **When** it makes an HTTP GET request to `/internal/tools/onboarding/faq` or `/internal/tools/onboarding/contacts/support` with a valid `internal_scoped_token`
3. **Then** the Backend must return structured JSON data from the PostgreSQL database
4. **And** the data must be securely filtered so it does not expose hidden or inactive records

## Tasks / Subtasks

- [ ] Task 1: Scaffold onboarding internal read endpoints in the backend module (AC: 1, 2)
  - [ ] Update `be/src/modules/onboarding/onboarding.module.ts` to register the onboarding controller/service and import `AuthModule` so `InternalAgentGuard` is available.
  - [ ] Create an internal controller under `be/src/modules/onboarding/` with route prefix `internal/tools/onboarding`.
  - [ ] Expose `GET /internal/tools/onboarding/faq` and `GET /internal/tools/onboarding/contacts/support` only; do not mix this story with external `/api/*` routes.
  - [ ] Protect both endpoints with `@UseGuards(InternalAgentGuard)` and `@AgentScope('read:onboarding')`.

- [ ] Task 2: Implement onboarding read services backed by Prisma (AC: 3, 4)
  - [ ] Create service methods that query `faq_items` and `contacts_directory` through `PrismaService`; controllers must not access Prisma directly.
  - [ ] Filter records with `is_active = true` and whitelist only safe response fields needed by the agent.
  - [ ] For support contacts, join `departments` so the payload can return a readable department name instead of only `department_id`.
  - [ ] Keep response properties in `camelCase` even though Prisma columns are `snake_case`.

- [ ] Task 3: Enforce internal API and observability contracts (AC: 2, 3, 4)
  - [ ] Rely on the existing global `SuccessResponseInterceptor` and `HttpExceptionFilter` for the standard `{ success, data, meta.traceId }` envelope; do not hand-roll response wrappers inside the controller.
  - [ ] Preserve traceability through the existing `X-Trace-Id` flow and avoid dropping request headers used by the internal guard (`X-Agent-Name`, `X-User-Id`, `X-Conversation-Id`).
  - [ ] Throw NestJS exceptions for invalid filters or missing resources so error responses keep the standard error-code contract.

- [ ] Task 4: Add focused automated tests for the new onboarding endpoints (AC: 2, 3, 4)
  - [ ] Add a controller spec that verifies the routes call the service and remain guard-protected using the same Nest testing style already used in `users.controller.spec.ts`.
  - [ ] Add a service spec that mocks Prisma and verifies only active FAQ/contact records are returned and mapped to the expected JSON shape.
  - [ ] Cover the department-name mapping for contacts and confirm inactive records are excluded from results.

- [ ] Task 5: Keep scope tight and aligned with downstream stories
  - [ ] Do not implement checklist completion, UI cards, OpenClaw tool definitions, or external user-facing FAQ/contact endpoints in this story; those belong to other stories.
  - [ ] Do not read from `generated/` or ad-hoc Markdown files as the source of truth for FAQ/contact responses when the database already contains these entities.

## Dev Notes

### Story Intent

Story 3.1 is the first delivery in Epic 3 and establishes the read-only onboarding knowledge bridge that the `onboarding_assistant` will use later. The main success condition is not just "return some rows", but exposing the two internal tool endpoints through the correct backend security boundary so future OpenClaw tool calls can consume them without bypassing RBAC, traceability, or service-layer rules.

### Current Codebase Intelligence

- `be/src/modules/onboarding/onboarding.module.ts` currently exists but is empty, so this story should build the first real onboarding backend slice rather than replacing existing behavior.
- `be/src/modules/auth/guards/internal-agent.guard.ts` already verifies bearer token validity, scope membership, and header/payload ownership alignment. Reuse it instead of inventing a second internal auth path.
- `be/src/common/interceptors/success-response.interceptor.ts` already wraps successful controller returns in the standard success envelope and attaches `traceId`.
- `be/src/common/filters/http-exception.filter.ts` already normalizes thrown Nest exceptions to the standard error payload.
- `be/src/infra/prisma/prisma.module.ts` is global, so onboarding services can inject `PrismaService` directly once the module/service is registered.

### Architecture Compliance

- Keep the boundary `OpenClaw -> Tool -> Backend Internal API -> Service -> Prisma -> PostgreSQL`; do not let controller logic query the database directly.
- Internal endpoints for this story must stay under `/internal/tools/onboarding/*`, matching the global architecture rules in the workspace `AGENTS.md`.
- The backend remains the security boundary. This story must not assume the agent can self-authorize, infer permissions, or access other business areas.
- The project-wide internal token contract uses a short-lived `internal_scoped_token`; this story consumes that token through `InternalAgentGuard`, it does not create or redefine token behavior.

### Data Contract Notes

- Relevant Prisma models already exist:
  - `faq_items`: `category`, `audience`, `question`, `answer`, `is_active`
  - `contacts_directory`: `name`, `department_id`, `role_title`, `email`, `phone`, `support_type`, `is_active`
  - `departments`: use relation loading when returning a human-readable department label for support contacts
- Whitelist response fields intentionally. The acceptance criteria mention preventing hidden/admin-only leakage; the safest implementation is to shape explicit DTO-style JSON objects instead of returning raw Prisma rows.
- Maintain `camelCase` in API output even though Prisma models expose `snake_case` database fields.

### Implementation Guardrails

- Reuse the existing NestJS patterns already present in the repo:
  - thin controller
  - service owns Prisma access
  - guards/decorators own access enforcement
  - Jest unit specs use `Test.createTestingModule(...)` with mocked dependencies
- Do not introduce a new custom response envelope, a new auth middleware stack, or raw SQL for this story.
- Keep this story read-only. No mutations should be added here.
- Avoid speculative support for unrelated filters or search UX unless it is necessary to satisfy the acceptance criteria.

### File Structure Requirements

- Update:
  - `be/src/modules/onboarding/onboarding.module.ts`
- Create:
  - `be/src/modules/onboarding/onboarding.service.ts`
  - `be/src/modules/onboarding/onboarding.internal.controller.ts`
  - `be/src/modules/onboarding/onboarding.service.spec.ts`
  - `be/src/modules/onboarding/onboarding.internal.controller.spec.ts`
- Optional only if genuinely needed by the chosen implementation:
  - `be/src/modules/onboarding/dto/*.ts`

### Library / Framework Requirements

- Backend stack in the current repo is pinned to NestJS `11.1.x`, Prisma `7.5.x`, Jest `30.x`, and TypeScript `5.9.x` via `be/package.json`.
- Follow the current NestJS testing pattern already used in `users` and `context-builder` specs instead of introducing another test runner or assertion style.

### Testing Requirements

- Service tests should mock `PrismaService` and verify:
  - active-only filtering
  - deterministic mapping to safe API shapes
  - department relation flattening for contacts
- Controller tests should verify:
  - controller methods delegate to the service
  - route-level protection remains compatible with `InternalAgentGuard`
- If query DTOs are introduced, validate them through Nest's standard validation path instead of manual parsing logic.

### Previous Story Intelligence

- Story 2.4 established the pattern of introducing a dedicated module service, wiring it through the consuming module, and covering the behavior with focused Jest specs instead of broad end-to-end scaffolding.
- Recent completed story files show that strict TypeScript cleanliness matters in this repo. Keep types explicit and avoid "any"-heavy shortcuts that may pass locally but fail `nest build`.
- The previous backend stories favored narrow, testable slices. Keep Story 3.1 equally small so Story 3.2 can own checklist-specific behavior without rework.

### Git / Workspace Notes

- Recent git history in this workspace is mostly documentation and AGENTS updates, so the most trustworthy implementation signals come from the live backend code rather than from recent commits.
- The architecture references a top-level `data/onboarding/` directory, but that path is not present in the current workspace. Do not make this story depend on missing filesystem content when the Prisma schema already contains `faq_items` and `contacts_directory`.

### References

- `AGENTS.md`:
  - Rule separation between external APIs and internal tool APIs
  - Tool mapping for `get_onboarding_faq` and `get_support_contacts`
  - Data-source rule that DB is the source of truth
- `be/AGENTS.md`:
  - Backend module responsibilities for `onboarding` and `tool-gateway`
  - Internal API auth rules and response format rules
- `be/src/modules/auth/guards/internal-agent.guard.ts`
- `be/src/common/interceptors/success-response.interceptor.ts`
- `be/src/common/filters/http-exception.filter.ts`
- `be/prisma/schema.prisma`
- `_bmad-output/planning-artifacts/epics.md`
- `_bmad-output/planning-artifacts/prd.md`
- `_bmad-output/planning-artifacts/architecture.md`
- `be/docs/plan/PLAN.md`
- `be/docs/architecture/backend-project-scaffold.md`

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- Story selected automatically from `_bmad-output/implementation-artifacts/sprint-status.yaml` as the first backlog item in read order.
- Story context synthesized from Epic 3, PRD onboarding requirements, backend architecture guides, current backend module structure, and the latest completed story file.

### Completion Notes List

- Comprehensive context created for the first story in Epic 3.
- Story is scoped to backend internal onboarding knowledge APIs only.
- Guardrails included to prevent direct DB access from controllers, mixed route namespaces, and source-of-truth drift.

### File List

- `_bmad-output/implementation-artifacts/3-1-support-directory-and-faq-internal-api-cau-noi-kien-thuc.md`
