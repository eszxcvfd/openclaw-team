# Story 2.4: Context Injector Middleware (Context Building)

Status: review

## Story

As the Backend Orchestrator,
I want to compile an employee's Profile and recent past session context into a unified block before forwarding the prompt,
So that the AI Engine always has explicit, personalized grounding data to reason with.

## Acceptance Criteria

1. **Given** an incoming chat request from an authenticated user
2. **When** the Backend prepares the payload for the OpenClaw Engine
3. **Then** it must query the database (Prisma) to fetch the user's Name, Department, and Role
4. **And** it must pull up to 10 latest conversation turns from the database
5. **And** it must inject this aggregated summary invisibly into the context sent to the AI Engine.

## Technical Requirements & Developer Context

### Architecture Compliance
- **Backend (NestJS):**
  - Implement `ContextBuilderService` in `be/src/modules/context-builder/context-builder.service.ts`.
  - Fetch user details including relations (Department, Position, Role).
  - Fetch last 10 messages for the current conversation.
  - Structure the output as defined in `PLAN.md` Section II.3 (Module: context-builder).

### File Structure Requirements
- `be/src/modules/context-builder/context-builder.service.ts`
- `be/src/modules/context-builder/context-builder.module.ts`
- `be/src/modules/chat/chat.service.ts` (Integration)

## Tasks / Subtasks

- [x] Task 1: Implement `ContextBuilderService`
  - [x] Create `buildUserContext(userId)` method.
  - [x] Create `buildConversationContext(conversationId)` method.
- [x] Task 2: Integrate Context into `ChatService`
  - [x] Update `ChatService.processMessage` to call `ContextBuilderService`.
- [x] Task 3: Unit Testing
  - [x] Verify context structure and data correctness.

## Dev Agent Record

### Debug Log

- Implemented `ContextBuilderService` to aggregate Prisma-backed user profile data and the latest 10 conversation turns into a prompt-ready context object.
- Wired `ContextBuilderModule` into `ChatModule` and updated `ChatService.processMessage()` to build invisible grounding context before mock orchestration persists the assistant reply.
- Fixed strict TypeScript issues in `chat.controller.ts` and `send-message.dto.ts` so the backend test suite and production build both pass.

### Completion Notes

- Added `build()`, `buildUserContext()`, and `buildConversationContext()` with `NotFoundException` guards and a context shape aligned to `PLAN.md`.
- Stored the internal prompt context in assistant message metadata during mock orchestration so the payload remains invisible to the client while still flowing through backend orchestration.
- Added focused unit tests for both `ContextBuilderService` and `ChatService`, then verified the full backend suite and NestJS build.

## File List

- `be/src/modules/context-builder/context-builder.service.ts`
- `be/src/modules/context-builder/context-builder.service.spec.ts`
- `be/src/modules/context-builder/context-builder.module.ts`
- `be/src/modules/chat/chat.service.ts`
- `be/src/modules/chat/chat.service.spec.ts`
- `be/src/modules/chat/chat.module.ts`
- `be/src/modules/chat/chat.controller.ts`
- `be/src/modules/chat/dto/send-message.dto.ts`

## Change Log

- `2026-03-22`: Implemented story 2.4 context building flow, integrated prompt context into chat orchestration, added unit tests, and fixed chat module TypeScript build blockers.
