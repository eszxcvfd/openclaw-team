# Story 3.3: Interactive Chat UI for Tool Outcomes (Giao dien Tuong tac)

Status: review

## Story

As an Employee,
I want to visually see my checklist or contact cards rendered beautifully inside the chat rather than reading a wall of plain text,
so that I can digest onboarding information quickly and act on it directly from the conversation.

## Acceptance Criteria

1. **Given** the AI chat stream delivers a structured UI payload marker for an onboarding tool outcome
2. **When** the frontend chat flow receives and parses that payload in the active conversation
3. **Then** the chat UI must render an inline visual card inside the assistant message area instead of showing the raw marker text
4. **And** checklist payloads must display task information clearly with interactive completion controls that feel native to the existing chat layout on desktop and mobile
5. **And** support-contact payloads must render as compact contact cards with the safe backend fields already exposed by Story 3.1
6. **Given** a user interacts with a checklist control inside the rendered card
7. **When** that interaction maps to completing a task
8. **Then** the frontend must call the existing backend completion flow through authenticated frontend APIs, update the visible chat state, and avoid requiring a full page reload
9. **And** if the structured payload is missing, malformed, or unsupported, the chat UI must gracefully fall back to plain assistant text rather than breaking message rendering or the streaming session

## Tasks / Subtasks

- [x] Task 1: Extend chat message parsing to recognize structured tool-outcome payloads (AC: 1, 2, 9)
  - [x] Update `fe/src/services/chatService.js` so the stream parser can distinguish plain text chunks from structured UI payload events without breaking the current text-stream behavior.
  - [x] Define a frontend-safe message shape for assistant messages that can carry both `content` text and an optional structured `uiPayload` object.
  - [x] Preserve the current SSE parsing behavior for standard text chunks and continue to ignore `[DONE]` markers cleanly.
  - [x] If the backend still emits only plain text, keep the old behavior untouched so this story does not regress the existing chat flow.

- [x] Task 2: Add structured chat rendering for onboarding cards in the chat dashboard (AC: 3, 4, 5, 9)
  - [x] Refactor `fe/src/pages/ChatDashboardPage.jsx` so assistant messages are rendered through a dedicated presentation path rather than directly outputting `message.content` inline.
  - [x] Render checklist payloads as inline onboarding cards with task title, description, due-day context, required state, and visible completion affordances.
  - [x] Render support-contact payloads as inline contact cards with safe fields already returned by the backend such as `name`, `departmentName`, `roleTitle`, `email`, `phone`, and `supportType`.
  - [x] Keep normal user messages and plain assistant text visually consistent with the current bubble-based chat UI.
  - [x] Ensure unsupported or malformed payloads fall back to plain text rendering instead of throwing runtime errors.

- [x] Task 3: Implement interactive checklist completion behavior inside the chat card (AC: 4, 6, 7, 8)
  - [x] Add a frontend API helper in `fe/src/services/` that uses the existing authenticated request pattern to complete a checklist task through the backend-facing API layer.
  - [x] Wire checklist card interactions so a user can complete a pending item directly from the card without refreshing the page.
  - [x] Update local chat message state optimistically only if the UI can do so safely; otherwise re-sync from the server immediately after the mutation succeeds.
  - [x] Disable repeated completion actions while a task completion request is in flight and preserve the idempotent backend behavior in the UI.
  - [x] Surface mutation failure with a user-friendly inline error or state hint instead of silently failing.

- [x] Task 4: Preserve frontend architecture, styling, and responsive behavior (AC: 3, 4, 5, 8, 9)
  - [x] Keep all UI work inside `fe/` and continue using JavaScript/JSX rather than introducing a TypeScript migration in this story.
  - [x] Reuse the existing visual system in `fe/src/index.css` and `fe/src/App.css`, extending it with targeted card styles rather than replacing the dashboard/chat layout.
  - [x] Ensure the new cards remain legible and interactive inside the existing chat panel at both desktop width and the <=980px / <=640px responsive breakpoints already used by the app.
  - [x] Preserve the current auth flow, React Query provider usage, and `useAuthStore`-based token access patterns.

- [x] Task 5: Validate the new UI flow through the available frontend quality gates (AC: 2, 3, 7, 8, 9)
  - [x] Add focused frontend tests only if a lightweight existing pattern already supports them; do not introduce a brand-new test framework in this story.
  - [x] At minimum, verify the story through `npm run lint`, `npm run build`, and manual interaction checks for: plain text chat, structured checklist rendering, support-contact rendering, checklist completion, and malformed-payload fallback.
  - [x] Document the exact manual verification steps in the story record so review can reproduce the UI behavior.

- [x] Task 6: Keep scope tight around Epic 3 chat outcomes
  - [x] Do not add or redesign backend internal endpoints in this story; Stories 3.1 and 3.2 already own the onboarding data APIs.
  - [x] Do not redesign the full dashboard, auth screens, or admin views while implementing the inline onboarding cards.
  - [x] Do not add unrelated mini-app frameworks, websocket stacks, or new state libraries when the current app already uses React state, React Query, and Zustand.

## Dev Notes

### Story Intent

Story 3.3 is the UI delivery layer for the onboarding capabilities created in Stories 3.1 and 3.2. The goal is to let the employee see structured onboarding results as actionable cards inside the existing chat experience instead of forcing them to read raw text blobs or raw payload markers.

### Current Codebase Intelligence

- `fe/src/pages/ChatDashboardPage.jsx` currently owns almost the entire chat experience: conversation list loading, message state, prompt suggestions, streaming placeholder handling, and plain-text bubble rendering.
- `fe/src/services/chatService.js` currently parses SSE-style `data:` lines, appends `eventData.data.chunk` into the assistant placeholder message, and ignores `[DONE]`; it does not yet understand structured UI payloads.
- `fe/src/services/apiClient.js` centralizes bearer token injection from `useAuthStore`, so any checklist completion mutation should reuse that authenticated request pattern.
- `fe/src/main.jsx` provides the shared React Query provider with retries disabled, which should remain the app-wide data-fetching baseline.
- `fe/src/App.css` and `fe/src/index.css` already define the current visual direction: glassy surfaces, warm accent colors, bubble-like cards, and responsive breakpoints at 980px and 640px.
- `fe/package.json` confirms the frontend stack is React 19 + Vite 8 + React Query 5 + Zustand 5 + Tailwind 4, but there is no frontend test runner configured today.

### Architecture Compliance

- Keep Story 3.3 entirely in `fe/`; this is a frontend/UI story, not a backend extension.
- Preserve the architecture rule that FE only talks to backend-facing APIs; it must not call OpenClaw directly.
- Keep the chat flow aligned with the existing SPA pattern: local component state for active message rendering, React Query for server fetches, and Zustand for auth/session token access.
- Assume the backend onboarding endpoints from Stories 3.1 and 3.2 are the source of truth; do not re-derive checklist/contact state from Markdown or generated files.

### Data Contract Notes

- Story 3.1 already exposes support-contact data with safe camelCase fields such as `name`, `departmentName`, `roleTitle`, `email`, `phone`, and `supportType`.
- Story 3.2 already exposes pending checklist data with safe camelCase fields such as `taskId`, `taskName`, `description`, `status`, `dueDay`, `required`, and `orderNo`.
- Story 3.2 completion is already idempotent and updates only the token user's matching `[user_id, onboarding_task_id]` record; the UI should respect that behavior and avoid inventing looser assumptions.
- Current `chatService.sendMessageStream()` expects SSE segments whose JSON body can contain `eventData.data.chunk`; Story 3.3 should define a backward-compatible extension for structured `uiPayload` data rather than replacing the text contract outright.
- If structured UI payload markers are streamed as text wrappers first, the frontend should parse them into a safe internal object and suppress raw marker display when rendering succeeds.

### Frontend Rendering Guardrails

- Introduce a dedicated render branch or helper for assistant messages so structured cards do not get mixed into the current raw-text JSX inline block.
- Keep raw text rendering as the fallback path for every assistant message.
- Preserve scroll-to-bottom behavior and streaming placeholder updates when cards appear mid-conversation.
- Do not let malformed structured payloads crash the page; prefer a recoverable plain-text fallback.
- Keep the visual language consistent with the current dashboard surfaces, rounded corners, and accent palette instead of introducing an unrelated component aesthetic.

### Interaction Guardrails

- Checklist actions should disable while mutation is in flight and should not allow accidental double-submit from repeated clicks.
- If the UI uses optimistic updates, they must stay narrowly scoped to the specific task card and be reversible on failure.
- If optimistic updates add too much fragility, prefer immediate re-sync from the backend after mutation success.
- Preserve the current conversation and message list state when a checklist action completes; this story is about inline action, not full chat reset.

### File Structure Requirements

- Likely update:
  - `fe/src/pages/ChatDashboardPage.jsx`
  - `fe/src/services/chatService.js`
  - `fe/src/App.css`
- Likely create if the implementation benefits from clearer separation:
  - `fe/src/components/chat/*.jsx`
  - `fe/src/components/chat/*.css` only if the existing `App.css` organization becomes too noisy
  - `fe/src/services/onboardingService.js` or a similarly narrow frontend API helper for checklist completion
- Keep file names in JavaScript/JSX form to match the current frontend app.

### Library / Framework Requirements

- Follow the existing frontend stack already present in `fe/package.json`: React `19.2.x`, Vite `8.0.x`, TanStack React Query `5.94.x`, Zustand `5.0.x`, Tailwind `4.2.x`, and axios `1.13.x`.
- Do not add a new component library or state library for this story; the current app already has enough primitives and patterns.
- Tailwind is available globally, but the current chat page relies mainly on CSS classes plus inline styles. Match the existing style mix instead of forcing a wholesale Tailwind rewrite.

### Testing Requirements

- There is no established frontend test runner in `fe/package.json`, so do not expand scope by installing Vitest, Jest, or Playwright in this story.
- Required automated validation for this story should include `npm run lint` and `npm run build` from `fe/`.
- Required manual validation should cover:
  - plain-text chat still streams normally
  - checklist payload renders as an inline onboarding card
  - support-contact payload renders as inline contact cards
  - clicking a checklist completion control updates the visible state without full-page reload
  - malformed or unsupported payload falls back to readable plain text
  - chat remains usable at desktop width and mobile breakpoints

### Previous Story Intelligence

- Story 3.1 already delivered the backend FAQ/support data contract; Story 3.3 should consume those safe fields rather than inventing a richer contact shape.
- Story 3.2 already delivered checklist read/completion endpoints, camelCase task payloads, strict read/write scope separation, and idempotent completion behavior; Story 3.3 should treat those backend rules as fixed contracts.
- Epic 3 has deliberately been split into backend slices first, then UI. Keep Story 3.3 focused on frontend rendering and interaction, not backend redesign.

### Git / Workspace Notes

- Recent commit titles are still mostly scaffolding/docs oriented:
  - `ac108f8 Add onboarding internal API story`
  - `81f7719 Add BMAD skills library and manifests`
  - `b713b37 Add formatted project plan document`
  - `0ce4096 Add frontend AGENTS guide`
- For this story, the live frontend files are more trustworthy than recent commit history for implementation guidance.

### References

- `AGENTS.md`
- `fe/AGENTS.md`
- `_bmad-output/planning-artifacts/epics.md`
- `_bmad-output/planning-artifacts/prd.md`
- `_bmad-output/planning-artifacts/architecture.md`
- `_bmad-output/implementation-artifacts/3-1-support-directory-and-faq-internal-api-cau-noi-kien-thuc.md`
- `_bmad-output/implementation-artifacts/3-2-onboarding-tasks-internal-api-cau-noi-nghiep-vu.md`
- `fe/src/pages/ChatDashboardPage.jsx`
- `fe/src/services/chatService.js`
- `fe/src/services/apiClient.js`
- `fe/src/main.jsx`
- `fe/src/App.css`
- `fe/src/index.css`
- `fe/package.json`

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- Story selected automatically from `_bmad-output/implementation-artifacts/sprint-status.yaml` as the first backlog item in read order.
- Story context synthesized from Epic 3 requirements, PRD onboarding journeys, architecture rules, the live frontend chat implementation, and completed backend onboarding API stories.
- Frontend analysis confirmed that `ChatDashboardPage.jsx` currently renders only plain text bubbles and `chatService.js` currently parses only `eventData.data.chunk`, so Story 3.3 must explicitly guide both parser extension and UI rendering.
- LSP diagnostics could not run in this environment because the configured `typescript-language-server` and `biome` executables are not installed; frontend verification used `npm run lint` and `npm run build` instead.
- Re-validated Story 3.3 against the live frontend implementation and current repo tooling; `vitest`, `eslint`, `vite build`, and LSP diagnostics all passed on 2026-03-23 before closing the sprint tracking gap.

### Completion Notes List

- Comprehensive frontend story context created for inline onboarding cards inside the chat experience.
- Guardrails included to keep scope in `fe/`, preserve JS/JSX conventions, and reuse the backend onboarding contracts from Stories 3.1 and 3.2.
- Validation requirements pinned to lint, build, and manual UI verification because the frontend currently has no test runner configured.
- Added a normalized assistant-message path that preserves plain-text SSE chunk behavior, ignores `[DONE]`, accepts explicit structured `uiPayload` data, and safely extracts supported marker-wrapped payloads with plain-text fallback.
- Refactored `ChatDashboardPage.jsx` so assistant messages render through a structured presentation path that can show checklist cards and support-contact cards inline while keeping standard message bubbles intact.
- Added authenticated checklist completion via a narrow frontend service helper, disabled repeated clicks while requests are in flight, updated affected checklist items in local chat state after success, and surfaced user-friendly inline task errors on failure.
- Corrected the frontend checklist completion helper to use the documented external backend route `/api/me/checklist/:taskId/complete` instead of an internal-style onboarding-prefixed path.
- Extended `fe/src/App.css` with targeted glass-card styles and responsive rules so the new structured cards stay aligned with the existing warm dashboard design language at desktop and mobile breakpoints.
- Manual verification steps: send a plain-text prompt and confirm normal streaming text; send a checklist payload and confirm inline checklist rendering with task metadata; complete a pending checklist item and confirm in-flight disabling plus inline status update without reload; send a support-contact payload and confirm compact contact cards with safe fields/links; send malformed or unsupported structured text and confirm readable plain-text fallback; review desktop, <=980px, and <=640px layouts.
- Final verification on 2026-03-23: `npm run test`, `npm run lint`, and `npm run build` all passed in `fe/`; sprint status was synchronized to `review` after confirming no frontend diagnostics remained.

### File List

- `_bmad-output/implementation-artifacts/3-3-interactive-chat-ui-for-tool-outcomes-giao-dien-tuong-tac.md`
- `fe/src/App.css`
- `fe/src/pages/ChatDashboardPage.jsx`
- `fe/src/pages/ChatDashboardPage.test.jsx`
- `fe/src/services/chatService.js`
- `fe/src/services/chatService.test.js`
- `fe/src/services/onboardingService.js`

## Change Log

- `2026-03-22`: Created the comprehensive ready-for-dev story context for interactive onboarding tool-outcome rendering in the frontend chat UI.
- `2026-03-22`: Implemented structured onboarding tool-outcome rendering, inline checklist completion, and frontend validation for Story 3.3.
- `2026-03-23`: Re-verified Story 3.3 with test/lint/build plus frontend diagnostics and synchronized sprint tracking to `review`.
