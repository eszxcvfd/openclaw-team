# Story 1.4: Zero-Trust Agent Tool Guardrail

Status: review

## Story

As the Backend Internal API Layer,
I want to intercept and validate all requests coming from the AI Engine to any `/internal/tools/*` endpoints,
So that the system strictly blocks hallucinating AI from overriding permissions or accessing cross-user data.

## Acceptance Criteria

1. **Given** the AI Engine makes an HTTP GET request to `/internal/tools/onboarding/me/profile`
2. **When** the request hits the NestJS Backend
3. **Then** the `InternalAgentGuard` middleware must verify the `internal_scoped_token` signature and expiry
4. **And** if the token tries to request data not belonging to the `userId` in the payload, it must immediately throw an HTTP 403 Forbidden exception.

## Technical Requirements & Developer Context

### Architecture Compliance
- **Backend (NestJS):**
  - Implement `InternalAgentGuard` in `be/src/modules/auth/guards/internal-agent.guard.ts`.
  - The guard must extract the token from `Authorization` header.
  - It must use `InternalTokenService.verifyToken()` to validate.
  - It must check if the `userId` in the token matches any `userId` parameter in the request (if applicable) or ensure the business logic respects the token's `userId`.
  - It must check if the `agent` in the token is allowed to access the specific endpoint/scope.

### File Structure Requirements
- `be/src/modules/auth/guards/internal-agent.guard.ts`
- `be/src/modules/auth/auth.module.ts` (exporting the guard or its dependencies)

## Tasks / Subtasks

- [x] Task 1: Implement `InternalAgentGuard`
  - [x] Extract Bearer token from headers.
  - [x] Call `InternalTokenService.verifyToken()`.
  - [x] Attach `internalAgent` (payload) to the request object.
  - [x] Implement scope/agent check logic.
- [x] Task 2: Create `AgentScope` decorator (Optional but recommended)
  - [x] To specify required scope for an endpoint.
- [x] Task 3: Unit Testing
  - [x] Create `be/src/modules/auth/guards/internal-agent.guard.spec.ts`.
  - [x] Test valid/invalid tokens and scope mismatches.

## Dev Agent Record

### Debug Log
- Audited the existing internal guard and identified that it validated token presence/signature plus scopes, but still missed cross-checks between token claims and request ownership headers/parameters.
- Extended the guard with zero-trust comparisons for `x-agent-name`, `x-user-id`, `x-conversation-id`, and any `userId` / `conversationId` values passed through params, query, or body.
- Added focused unit tests to verify the guard now rejects cross-user and cross-agent access attempts in addition to scope mismatches.

### Completion Notes
- `InternalAgentGuard` now enforces that request headers and route payloads cannot override the `agent`, `userId`, or `conversationId` embedded in the validated internal token.
- The guard still attaches `internalAgent` to the request after validation, so downstream internal tool handlers can safely use token-scoped identity information.
- New tests cover header mismatch, route-param ownership mismatch, and agent-name mismatch alongside the original valid/invalid token and scope scenarios.

## File List
- `be/src/modules/auth/guards/internal-agent.guard.ts`
- `be/src/modules/auth/guards/internal-agent.guard.spec.ts`

## Change Log
- `2026-03-22`: Completed the remaining story 1.4 zero-trust checks by binding internal requests to token-scoped agent, user, and conversation ownership.
