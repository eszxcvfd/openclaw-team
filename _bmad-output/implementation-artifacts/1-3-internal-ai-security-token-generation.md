# Story 1.3: Internal AI Security Token Generation

Status: review

## Story

As the Backend Orchestrator,
I want to automatically generate a short-lived `internal_scoped_token` right before calling the AI Engine,
So that the AI has a restricted, temporary passport to query data on behalf of the user.

## Acceptance Criteria

1. **Given** a user sends a chat message that needs AI reasoning
2. **When** the Backend prepares to forward the message to the OpenClaw Engine
3. **Then** it must generate a JWT signed with a separate internal secret
4. **And** the token MUST have a Time-to-Live (TTL) of exactly 5 minutes
5. **And** the payload MUST contain the `userId`, `conversationId`, and the restricted `scopes` for that specific AI agent.

## Technical Requirements & Developer Context

### Architecture Compliance
- **Backend (NestJS):**
  - Use `InternalTokenService` to handle token generation.
  - The secret `JWT_INTERNAL_SECRET` must be different from `JWT_ACCESS_SECRET`.
  - The TTL must be 300 seconds (5 minutes).
  - The payload must be structured as specified in `AGENTS.md` Rule 5.

### File Structure Requirements
- `be/src/modules/auth/internal-token.service.ts`
- `be/src/modules/auth/auth.module.ts` (exporting the service)

## Tasks / Subtasks

- [x] Task 1: Implement `InternalTokenService`
  - [x] Define `InternalTokenPayload` interface.
  - [x] Implement `createToken(agentGroup, userId, conversationId, scopes)` method.
  - [x] Use `JWT_INTERNAL_SECRET` from environment.
  - [x] Set expiration to 300 seconds.
- [x] Task 2: Update `AuthModule`
  - [x] Add `InternalTokenService` to providers and exports.
- [x] Task 3: Unit Testing
  - [x] Create `be/src/modules/auth/internal-token.service.spec.ts`.
  - [x] Test token generation and payload verification.

## Dev Agent Record

### Debug Log
- Reviewed `InternalTokenService` against the story and found two missing hardening rules: TTL needed to be expressed as an exact 300-second value and the internal signing secret needed to be rejected if it matched the normal access-token secret.
- Refactored the service to centralize internal-secret validation so both token creation and verification enforce the same separation guarantees.
- Expanded unit coverage to lock in the separate-secret invariant and the updated unauthorized behavior for invalid or expired internal tokens.

### Completion Notes
- `InternalTokenService.createToken()` now signs internal tokens with `expiresIn: 300`, matching the story’s exact five-minute TTL requirement.
- The service now throws configuration errors if `JWT_INTERNAL_SECRET` is missing or accidentally matches `JWT_ACCESS_SECRET`, preserving the architecture rule that the internal token secret must be distinct.
- Verification failures now surface as `UnauthorizedException`, which better matches the semantics of an invalid or expired internal-scoped token.

## File List
- `be/src/modules/auth/internal-token.service.ts`
- `be/src/modules/auth/internal-token.service.spec.ts`

## Change Log
- `2026-03-22`: Finished story 1.3 hardening by enforcing exact 300-second TTLs, validating secret separation, and tightening invalid-token behavior in unit tests.
