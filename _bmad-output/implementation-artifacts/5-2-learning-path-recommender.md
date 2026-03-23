# Story 5.2: Learning Path Recommender

Status: review

## Story

As an Employee,
I want the AI to suggest a sequence of courses based on my current skill gaps,
so that I know what to study next for a promotion.

## Acceptance Criteria

1. **Given** the user asks for learning recommendations in chat
2. **When** the AI uses the training-domain learning-path capability for that authenticated user
3. **Then** the backend must derive the user's current skills, role/position requirements, and eligible courses from the training schema instead of fabricating a path from free text alone
4. **And** the backend must expose the user-visible learning-path data through the existing training API surface, keeping internal tool routes under `/internal/tools/training/*` and frontend-facing routes under `/api/*`
5. **And** the assistant turn delivered to the frontend must include readable assistant text plus one compact structured `uiPayload` for the recommended roadmap over the existing SSE chat contract
6. **And** the chat UI must render that roadmap inline as an interactive learning-path card rather than a wall of plain text
7. **And** reopening conversation history must still hydrate the learning-path card correctly from persisted message metadata
8. **And** all recommendation, learning-path generation, persistence, and retrieval flows must preserve traceability, ownership checks, audit logging, and graceful fallback to plain text if the structured payload is missing or malformed

## Tasks / Subtasks

- [x] Task 1: Implement backend learning-path recommendation and retrieval flows in the training module (AC: 1, 2, 3, 4, 8)
  - [x] Extend `be/src/modules/training/training.service.ts` with service-owned Prisma logic for current path retrieval, recommendation synthesis, and optional path generation persistence.
  - [x] Reuse thin-controller patterns from the quiz slice instead of moving business logic into controllers.
  - [x] Read from `users`, `user_skills`, `role_skill_requirements`, `courses`, `course_skills`, `user_courses`, `learning_paths`, `learning_path_items`, and `user_learning_paths` as the source of truth.
  - [x] Exclude inactive or duplicate course suggestions and avoid recommending courses the user has already completed unless a clear retry rule is explicitly needed.

- [x] Task 2: Add the correct internal and external API endpoints without mixing security models (AC: 2, 3, 4, 8)
  - [x] Add internal training endpoints under `be/src/modules/training/training.internal.controller.ts` for the AI/tool path, using `InternalAgentGuard` and `@AgentScope(...)`.
  - [x] Support the existing documented external endpoints in `be/src/modules/training/training.controller.ts` for `GET /api/me/training-recommendations`, `GET /api/me/learning-path`, and `POST /api/me/learning-path/generate`, even if the current controller root must be widened or split away from `@Controller('api/quiz')`.
  - [x] Derive internal identity only from `request.internalAgent.userId` and external identity only from the authenticated JWT user.
  - [x] Keep response envelopes, trace metadata, and error behavior aligned with the existing global backend stack.
  - [x] Pin the internal endpoint matrix explicitly:
    - `GET /internal/tools/training/me/learning-path` -> read the user's current active learning path using `@AgentScope('read:training')`
    - `POST /internal/tools/training/me/learning-path/generate` -> generate or refresh the user's personalized path using `@AgentScope('write:training')`
    - `GET /internal/tools/training/me/training-recommendations` -> return gap-based recommendations using `@AgentScope('read:training')`
  - [x] Keep quiz routes in their existing quiz surface; do not silently overload quiz-only controller decorators with learning-path handlers without making the route layout explicit in code.

- [x] Task 3: Define a stable learning-path chat payload contract and persist it in conversation metadata (AC: 5, 7, 8)
  - [x] Reuse the existing one-message/one-`uiPayload` chat contract instead of inventing a second transport or event type.
  - [x] Introduce one compact payload type for the roadmap card, for example `learning-path`, with deterministic fields for title, summary, ordered items, gap rationale, and CTA labels if needed.
  - [x] Persist the assistant-side roadmap payload in `messages.metadata` so historical conversations can rehydrate the card.
  - [x] Keep the payload small and frontend-safe because tool results in the broader OpenClaw pipeline may be sanitized or truncated.
  - [x] Add one canonical backend-shaped `learning-path` payload example to align BE DTO shaping, FE normalization, and history persistence:
    ```json
    {
      "type": "learning-path",
      "version": 1,
      "pathId": "user-path-uuid",
      "title": "Backend Intern Growth Path",
      "description": "Lo trinh hoc de dat muc Junior Backend.",
      "contextLabel": "Gap: Node.js, PostgreSQL, Security Basics",
      "generated": true,
      "items": [
        {
          "orderNo": 1,
          "courseId": "course-uuid-1",
          "courseCode": "PROD-OVERVIEW",
          "courseTitle": "Product Overview",
          "required": true,
          "reason": "Mon nen tang bat buoc truoc khi hoc ky nang chuyen mon",
          "estimatedHours": 2,
          "status": "not_started"
        }
      ],
      "summary": "Bat dau voi Product Overview, sau do hoc NodeJS Basic."
    }
    ```

- [x] Task 4: Render the roadmap inline in the existing chat dashboard and preserve current UX behavior (AC: 5, 6, 7, 8)
  - [x] Extend `fe/src/services/chatService.js` so `normalizeUiPayload()` recognizes and normalizes the new learning-path payload without regressing checklist, support-contact, or quiz handling.
  - [x] Add a dedicated roadmap card render path in `fe/src/pages/ChatDashboardPage.jsx` beside the existing structured assistant card types.
  - [x] Reuse `fe/src/services/trainingService.js` for any external learning-path fetch/generate actions required by the UI.
  - [x] Keep the implementation in JavaScript/JSX to match the live frontend app; do not start a TypeScript migration in this story.

- [x] Task 5: Keep recommendation logic aligned with the live schema and current product rules (AC: 3, 4, 6, 8)
  - [x] Use role/position skill requirements as the primary gap-analysis source rather than hardcoded keyword rules.
  - [x] Prefer existing active learning-path templates when they already match the user's department/position/target level, and persist user-specific generated output through `user_learning_paths.generated_payload` when personalization is needed.
  - [x] Order recommended courses intentionally, respecting prerequisite relationships and required path items where relevant.
  - [x] Do not treat `generated/` files as the source of truth for learning-path data.
  - [x] Define the `user_learning_paths` lifecycle explicitly:
    - `GET /api/me/learning-path` returns the single current row for the authenticated user where `status = 'active'`, preferring the most recently updated record.
    - If the active row links to `learning_path_id`, hydrate ordered items from `learning_paths` + `learning_path_items` and merge user-specific fields from `generated_payload` only when needed.
    - If the active row has no `learning_path_id`, treat `generated_payload` as the persisted user-specific roadmap view and return that shape directly.
    - `POST /api/me/learning-path/generate` creates a new active `user_learning_paths` row (or replaces the previous active row by marking older active rows inactive) so there is exactly one current path per user for this story.
  - [x] Define recommendation fallback behavior so the dev agent does not guess:
    - if the user has no `position_id` or no `role_skill_requirements`, fall back to active department/role-aligned templates when available
    - if no eligible courses remain after filtering completed/inactive items, return a valid empty-state roadmap payload plus assistant text instead of throwing a generic 500
    - if prerequisite chains block all advanced courses, recommend the nearest unmet prerequisite courses first

- [x] Task 6: Preserve architecture boundaries and existing repo conventions (AC: 2, 4, 5, 8)
  - [x] Do not let the frontend call OpenClaw or `/internal/tools/*` directly.
  - [x] Do not let OpenClaw query PostgreSQL directly; all training data must flow through backend services and internal tool APIs.
  - [x] Keep the feature inside the training domain; do not leak onboarding or analytics-only concerns into this story.
  - [x] Follow the live repo conventions: JS/JSX frontend and the current introspected Prisma model naming.

- [x] Task 7: Validate backend, frontend, and history rehydration behavior with automated checks (AC: 4, 5, 6, 7, 8)
  - [x] Add backend tests for recommendation selection, generated path persistence, ownership checks, internal scope enforcement, and message metadata persistence.
  - [x] Add frontend tests for learning-path payload normalization, inline roadmap rendering, malformed-payload fallback, and conversation history rehydration.
  - [x] Run `npm run prisma:generate`, `npm run build`, and `npm run test` in `be/` for backend changes.
  - [x] Run `npm run lint`, `npm run test`, and `npm run build` in `fe/` for the frontend slice.

## Dev Notes

### Story Intent

Story 5.2 is the second Epic 5 slice and should turn training recommendations into a chat-native roadmap experience. The target is not a generic list of courses, but a personalized, ordered learning path grounded in the live training schema and rendered inline in the existing chat experience.

### Epic and Product Context

- Epic 5 covers the Growth-phase training experience: quizzes plus personalized learning guidance for promotion readiness.
- The PRD and epic breakdown both position learning recommendations as a skill-gap problem, not a static course catalog browse.
- The architecture still requires Backend-Controlled AI Orchestration: backend computes or exposes the trusted data, OpenClaw reasons over that data, and the frontend renders only backend-approved payloads.

### Current Codebase Intelligence

- `be/src/modules/training/training.service.ts` already contains the first real training-domain implementation slice for quizzes and is the best live pattern for service-owned Prisma access, DTO shaping, ownership checks, and metadata persistence.
- `be/src/modules/training/training.controller.ts` and `be/src/modules/training/training.internal.controller.ts` already split external and internal security models correctly; extend those files instead of creating a parallel training surface.
- `fe/src/services/chatService.js` already normalizes structured payloads for checklist, support contacts, and quiz cards; the learning-path contract should slot into the same normalizer.
- `fe/src/pages/ChatDashboardPage.jsx` already renders structured assistant cards inline in chat and already supports persisted quiz-card rehydration; reuse that model for roadmap rendering.
- `fe/src/services/trainingService.js` already exists as the frontend training-service entry point and should be extended rather than replaced.
- No learning-path-specific implementation was found in the live backend/frontend code beyond schema and API documentation, so this story needs to establish that slice cleanly.
- No app-specific `learning_training_agent` implementation was found in the visible `openclaw/` tree; prefer a narrow backend/orchestrator mapping into the existing chat `uiPayload` contract over deep OpenClaw runtime redesign.

### Architecture Compliance

- Backend remains the only security boundary for auth, RBAC, scoped internal tokens, tool routing, and audit logging. [Source: `AGENTS.md`; `be/AGENTS.md`]
- Frontend must continue to call authenticated backend APIs only. [Source: `AGENTS.md`; `fe/AGENTS.md`]
- Internal training tool routes must stay under `/internal/tools/training/*`; user-facing APIs must stay under `/api/*`. [Source: `AGENTS.md`; `be/docs/api/API_SPEC.md`]
- PostgreSQL is the source of truth; generated artifacts or markdown outputs are support artifacts only. [Source: `AGENTS.md`; `be/AGENTS.md`]

### Project Structure Notes

- The architecture artifact describes a TypeScript-first frontend ideal, but the live frontend is JavaScript/JSX. Match the live repo. [Source: `fe/AGENTS.md`; `fe/package.json`]
- The live Prisma client uses introspected snake_case model and field names such as `learning_paths`, `learning_path_items`, and `user_learning_paths`. Do not start a schema-wide renaming refactor in this story. [Source: `be/prisma/schema.prisma`]
- Keep training feature work inside `be/src/modules/training/` and `fe/src/` instead of creating new top-level feature islands. [Source: `be/AGENTS.md`; `fe/AGENTS.md`]

### Learning Path Data Contract Notes

- Relevant live Prisma tables and relationships:
  - `course_skills(course_id, skill_id, outcome_level)` links courses to the skill improvements they provide. [Source: `be/prisma/schema.prisma`]
  - `courses` includes `code`, `title`, `description`, `level_no`, `duration_hours`, `format`, and `is_active`. [Source: `be/prisma/schema.prisma`]
  - `learning_paths` stores reusable path templates with `department_id`, `position_id`, `target_level`, and `is_active`. [Source: `be/prisma/schema.prisma`]
  - `learning_path_items` stores ordered courses per path with `order_no` and `required`. [Source: `be/prisma/schema.prisma`]
  - `user_learning_paths` stores user-linked generated output through `generated_payload`, `status`, and `generated_at`. [Source: `be/prisma/schema.prisma`]
  - `user_skills` and `role_skill_requirements` provide the gap-analysis inputs for recommendations. [Source: `be/prisma/schema.prisma`; `be/docs/api/API_SPEC.md`]
- Existing API documentation already defines:
  - `GET /api/me/training-recommendations` for gap-based recommendations
  - `GET /api/me/learning-path` for the current path
  - `POST /api/me/learning-path/generate` for personalized path generation
  Those routes should be honored or brought into alignment instead of inventing a new public surface. [Source: `be/docs/api/API_SPEC.md`]
- The epic acceptance also expects the AI-side training capability to work through `/internal/tools/training/me/learning-path`; add internal endpoints that match the tool pattern and keep them training-scoped. [Source: `_bmad-output/planning-artifacts/epics.md`; `AGENTS.md`]
- Canonical route ownership for this story:
  - External user-auth routes live in `be/src/modules/training/training.controller.ts` (or a training external controller split from the current quiz root if needed).
  - Internal AI/tool routes live in `be/src/modules/training/training.internal.controller.ts`.
  - `GET /api/me/training-recommendations` and `GET /internal/tools/training/me/training-recommendations` are read-only.
  - `GET /api/me/learning-path` and `GET /internal/tools/training/me/learning-path` are read-only.
  - `POST /api/me/learning-path/generate` and `POST /internal/tools/training/me/learning-path/generate` are write operations and should map to the generate/refresh path lifecycle.

### Recommended UI Payload Shape

- Use one compact assistant payload type such as `learning-path`.
- Suggested payload fields:
  - `type`, `version`, `pathId`, `title`, `description`
  - `contextLabel` (role / target level / gap summary)
  - `generated` boolean
  - `items[]` with `orderNo`, `courseId`, `courseCode`, `courseTitle`, `required`, `reason`, `estimatedHours`, and optional `status`
  - optional `summary` or `nextStepLabel`
- Keep the payload compact, deterministic, and frontend-safe; do not embed large raw ORM responses or hidden internal scoring/explanation fields.
- Canonical external API response example for generated-path retrieval:
  ```json
  {
    "success": true,
    "data": {
      "id": "user-path-uuid",
      "name": "Backend Intern Growth Path",
      "generated": true,
      "items": [
        {
          "orderNo": 1,
          "courseId": "course-uuid-1",
          "courseTitle": "Product Overview",
          "required": true,
          "reason": "Mon nen tang bat buoc"
        }
      ]
    },
    "meta": {
      "traceId": "trace-uuid"
    }
  }
  ```

### Frontend Rendering and Interaction Guardrails

- Reuse the existing structured assistant card model in `ChatDashboardPage.jsx` rather than creating a separate training dashboard or page transition for this story. [Source: `fe/src/pages/ChatDashboardPage.jsx`]
- Extend `normalizeUiPayload()` in `chatService.js` by adding a focused learning-path branch, mirroring the quiz/checklist/support-contact approach. [Source: `fe/src/services/chatService.js`]
- Preserve current streaming behavior so assistant text and roadmap cards can coexist in the same message lifecycle. [Source: `fe/src/services/chatService.js`; `fe/src/pages/ChatDashboardPage.jsx`]
- Unsupported or malformed roadmap payloads must fall back to readable plain text instead of breaking the chat UI. [Source: `fe/src/services/chatService.js`]
- Historical learning-path cards must rehydrate from persisted message metadata when a conversation is reopened from the sidebar. Reuse the quiz-history pattern rather than inventing a second persistence model. [Source: `_bmad-output/implementation-artifacts/5-1-ai-mini-quiz-generator-and-grading.md`; `fe/src/pages/ChatDashboardPage.jsx`]

### Backend and API Guardrails

- Keep controllers thin and put recommendation/generation logic in `TrainingService`. [Source: `be/AGENTS.md`; `be/src/modules/training/training.service.ts`]
- Use the same ownership model as the quiz slice: internal routes derive `userId` from `request.internalAgent.userId`, external routes derive `userId` from the authenticated JWT user. [Source: `be/src/modules/training/training.controller.ts`; `be/src/modules/training/training.internal.controller.ts`]
- Apply DTO validation to any new inputs and prefer explicit parse/validation patterns already used in NestJS. [Source: librarian framework guidance; `be/src/modules/training/dto/*.ts` pattern]
- Reuse existing standardized response envelopes, trace metadata, and audit/logging behavior instead of creating learning-path-specific wrappers or loggers. [Source: `AGENTS.md`; `be/AGENTS.md`]
- Do not let the recommendation logic bypass course activation flags, ownership rules, or route namespace boundaries.

### OpenClaw and Tool Guardrails

- Keep the OpenClaw side minimal for this story. The safest implementation is a backend-produced structured payload carried through the current SSE/UI pipeline, not a broad OpenClaw runtime redesign.
- If the assistant needs both recommendation text and roadmap structure, send one assistant message containing normal text plus one compact `uiPayload`, just like the current quiz flow. [Source: `_bmad-output/implementation-artifacts/5-1-ai-mini-quiz-generator-and-grading.md`; `fe/src/services/chatService.js`]
- Do not assume raw tool-result bodies will always reach the browser intact; preserve any required structured data through backend-controlled message metadata.
- The explicit backend touchpoint for this story is the chat/orchestration layer that already emits assistant SSE output and stores assistant message metadata. Assign the learning-path payload production/persistence change to `be/src/modules/chat/chat.service.ts` and any paired message-history persistence/retrieval logic it already uses, instead of leaving roadmap emission as an implied side effect.
- Trigger rule: emit the `learning-path` `uiPayload` only when the assistant turn resolves to a successful recommendation/current-path/generate-path result; if the backend returns an empty-state recommendation, still emit assistant text and only emit a payload when the frontend can render a meaningful empty-state card.

### Previous Story Intelligence

- Story 5.1 established the first training-domain implementation slice and should be treated as the immediate coding template for Story 5.2.
- Reuse the quiz story's key patterns:
  - thin external/internal controllers in the training module
  - service-owned Prisma access and DTO shaping
  - persisted assistant `uiPayload` in `messages.metadata`
  - frontend structured-card normalization in `chatService.js`
  - inline chat rendering in `ChatDashboardPage.jsx`
  - history rehydration from persisted metadata
- Also reuse the explicit warning from Story 5.1: follow the live repo conventions instead of broad cleanup refactors suggested by higher-level architecture docs. [Source: `_bmad-output/implementation-artifacts/5-1-ai-mini-quiz-generator-and-grading.md`]

### Git Intelligence Summary

- Recent commits show Epic 5 and BMAD artifact work landing incrementally, not through broad cross-repo rewrites.
- The latest relevant commit is `a1b94b7 Add AI mini-quiz story and update sprint status`, which reinforces that Epic 5 work is being delivered as narrow, story-scoped slices.
- Match that pattern: build Story 5.2 as a focused learning-path slice on top of the training/chat infrastructure already added in Story 5.1.

### Latest Technical Information

- NestJS validation: prefer a global `ValidationPipe` with `whitelist`, `forbidNonWhitelisted`, and `transform`, and keep controller parameters explicit with Nest parse pipes where needed. [Source: librarian framework guidance]
- Prisma/PostgreSQL: keep one shared Prisma client, use targeted `select`/`include` to avoid overfetching, and keep production migration flow on deploy-safe commands only. [Source: librarian framework guidance]
- TanStack Query v5: use object-style hooks and remember that recommender data is server state; set `staleTime` intentionally if learning-path generation is expensive. [Source: librarian framework guidance; `fe/package.json`]
- Zustand v5: avoid unstable selector return values; keep Zustand for UI/client state, not for primary learning-path server data. [Source: librarian framework guidance; `fe/package.json`]
- Tailwind CSS v4: avoid accidental styling regressions from renamed/changed utilities; stay within the current styling system instead of introducing a second UI framework. [Source: librarian framework guidance; `fe/package.json`]

### File Structure Requirements

- Existing backend files likely involved:
  - `be/src/modules/training/training.service.ts`
  - `be/src/modules/training/training.controller.ts`
  - `be/src/modules/training/training.internal.controller.ts`
  - `be/src/modules/training/training.module.ts`
  - `be/src/modules/chat/chat.service.ts`
  - `be/src/modules/chat/conversation.service.ts`
  - `be/prisma/schema.prisma`
  - `be/docs/api/API_SPEC.md`
- Existing frontend files likely involved:
  - `fe/src/services/chatService.js`
  - `fe/src/pages/ChatDashboardPage.jsx`
  - `fe/src/services/trainingService.js`
  - focused frontend test files beside those surfaces
- Likely new backend files:
  - DTO files under `be/src/modules/training/dto/` for learning-path retrieval/generation inputs if the existing routes need validated request bodies
- Do not create a new top-level learning-path module, a new page-level training app, or a parallel streaming transport for this story.

### Testing Requirements

- Backend:
  - verify recommendation logic uses skill-gap inputs from the live schema
  - verify inactive/duplicate/already-completed course handling
  - verify current-path retrieval and generated-path persistence in `user_learning_paths`
  - verify internal tool access still respects `InternalAgentGuard` and scope checks
  - verify assistant `uiPayload` metadata persists and can be read back through message history
- Frontend:
  - verify `normalizeUiPayload()` can normalize the new learning-path payload
  - verify roadmap cards render inline in chat with both text and structured content
  - verify malformed payloads fall back to plain text
  - verify reopened conversations still render structured learning-path cards
- Required command coverage for touched surfaces:
  - `be/`: `npm run prisma:generate`, `npm run build`, `npm run test`
  - `fe/`: `npm run lint`, `npm run test`, `npm run build`

### Scope Boundaries

- This story is about learning-path recommendation, retrieval, inline rendering, and persistence only.
- Do not redesign the full chat dashboard, the quiz flow, onboarding cards, or analytics dashboards.
- Do not introduce a general recommendation engine framework across all domains.
- Do not turn this story into a full OpenClaw agent-runtime rewrite.

### Missing Inputs / Context Notes

- No dedicated UX file was discovered for Epic 5, so the roadmap card should extend the current chat-card visual language instead of inventing a new design system.
- No `project-context.md` file was discovered during artifact loading.
- No app-specific training-agent implementation was found in the visible `openclaw/` tree, so any OpenClaw-facing work should remain minimal and backend-driven.

### References

- `AGENTS.md`
- `be/AGENTS.md`
- `fe/AGENTS.md`
- `_bmad-output/planning-artifacts/epics.md`
- `_bmad-output/planning-artifacts/prd.md`
- `_bmad-output/planning-artifacts/architecture.md`
- `_bmad-output/implementation-artifacts/5-1-ai-mini-quiz-generator-and-grading.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `be/docs/api/API_SPEC.md`
- `be/prisma/schema.prisma`
- `be/src/modules/training/training.service.ts`
- `be/src/modules/training/training.controller.ts`
- `be/src/modules/training/training.internal.controller.ts`
- `fe/src/services/chatService.js`
- `fe/src/pages/ChatDashboardPage.jsx`
- `fe/src/services/trainingService.js`
- `be/package.json`
- `fe/package.json`

## Dev Agent Record

### Agent Model Used

openai/gpt-5.4

### Debug Log References

- Story selected automatically from `_bmad-output/implementation-artifacts/sprint-status.yaml` as the first backlog item in read order: `5-2-learning-path-recommender`.
- Source context loaded from `epics.md`, `prd.md`, `architecture.md`, `5-1-ai-mini-quiz-generator-and-grading.md`, live backend/frontend code, Prisma schema, and current package versions.
- Repo analysis confirmed that the live extension points are the training module on the backend and the structured `uiPayload` chat-card path on the frontend.
- Repo analysis also confirmed a gap: there is currently no dedicated learning-path implementation slice in `be/src/modules/training/` or a learning-path payload branch in `fe/src/services/chatService.js`.
- External guidance was added for NestJS validation, Prisma usage, TanStack Query v5, Zustand v5, and Tailwind CSS v4 to prevent version-specific implementation mistakes.
- Added red-first coverage for training service/controller/internal controller, chat SSE emission, frontend payload normalization, and chat roadmap rendering before implementing the feature.
- TypeScript LSP diagnostics were unavailable in this environment because `typescript-language-server` is not installed, so verification relied on project builds and full automated test runs instead.
- Validation completed with `be/`: `npm run prisma:generate`, `npm run build`, `npm test`; and `fe/`: `npm run lint`, `npm run test`, `npm run build`.

### Completion Notes List

- Comprehensive ready-for-dev story context created for Story 5.2 Learning Path Recommender.
- Guardrails added for backend route boundaries, skill-gap recommendation inputs, compact roadmap payloads, inline chat rendering, metadata rehydration, and training-domain ownership/security checks.
- Story intentionally reuses Story 5.1 patterns to avoid duplicate architecture and keep Epic 5 implementation incremental.
- Story explicitly warns the dev agent to follow the live repo conventions (JS/JSX frontend and current Prisma schema naming) instead of broad cleanup refactors.
- No UX artifact or project-context artifact was available, so the story anchors itself to the current chat-card implementation language and the live repo files.
- Implemented backend learning-path recommendation, active-path retrieval, and personalized path generation in `TrainingService`, including active-row replacement in `user_learning_paths` and compact roadmap payload shaping.
- Expanded the training API surface with external `GET /api/me/training-recommendations`, `GET /api/me/learning-path`, `POST /api/me/learning-path/generate` and matching internal tool endpoints under `/internal/tools/training/me/*` with read/write training scopes.
- Extended the mock chat orchestration flow so learning-path prompts emit a versioned `learning-path` `uiPayload` over the existing SSE contract and persist that payload in assistant message metadata for history rehydration.
- Added frontend roadmap normalization and an inline learning-path card in `ChatDashboardPage.jsx`, while preserving existing checklist, support-contact, and quiz behavior.
- Verified the slice with focused red/green tests plus full backend/frontend validation; all project tests passed, with one expected logger error line emitted from an existing tool-gateway spec while the backend suite still finished green.

### File List

- `_bmad-output/implementation-artifacts/5-2-learning-path-recommender.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `be/src/modules/training/dto/generate-learning-path.dto.ts`
- `be/src/modules/training/training.controller.ts`
- `be/src/modules/training/training.controller.spec.ts`
- `be/src/modules/training/training.internal.controller.ts`
- `be/src/modules/training/training.internal.controller.spec.ts`
- `be/src/modules/training/training.service.ts`
- `be/src/modules/training/training.service.spec.ts`
- `be/src/modules/chat/chat.service.ts`
- `be/src/modules/chat/chat.service.spec.ts`
- `fe/src/services/trainingService.js`
- `fe/src/services/chatService.js`
- `fe/src/services/chatService.test.js`
- `fe/src/pages/ChatDashboardPage.jsx`
- `fe/src/pages/ChatDashboardPage.test.jsx`

## Change Log

- `2026-03-23`: Created the comprehensive ready-for-dev story context for Story 5.2 Learning Path Recommender.
- `2026-03-23`: Implemented Story 5.2 learning-path recommendation APIs, chat roadmap payload persistence, frontend roadmap rendering, and automated validation coverage.
