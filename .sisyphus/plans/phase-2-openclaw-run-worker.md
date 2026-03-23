# Phase 2 — OpenClaw `/run` Worker and Backend-Wrapper Tools

## Status

**In Progress**

Current checkpoint: **Slice 1 completed, Slice 2 pending**

## Progress Marker

### Slice 1 — Completed

Implemented in `openclaw/`:

- worker contract and 3-agent registry
- business-agent preparation layer
- backend-wrapper tools for current onboarding/training/analytics internal endpoints
- `/run` handler mounted on the gateway HTTP server
- embedded-runner seam for executable injected tools

Files added or changed in this completed slice:

- `openclaw/src/gateway/run-workers/registry.ts`
- `openclaw/src/gateway/run-workers/openclaw-app.ts`
- `openclaw/src/gateway/run-workers/backend-tools.ts`
- `openclaw/src/gateway/run-http.ts`
- `openclaw/src/gateway/server-http.ts`
- `openclaw/src/agents/pi-embedded-runner/run/params.ts`
- `openclaw/src/agents/command/types.ts`
- `openclaw/src/agents/agent-command.ts`
- `openclaw/src/agents/pi-embedded-runner/run/attempt.ts`
- `openclaw/src/gateway/run-workers/registry.test.ts`
- `openclaw/src/gateway/run-http.test.ts`

Verification completed for Slice 1:

- diagnostics clean on changed files
- `openclaw` build passed
- focused tests passed:
  - `src/gateway/run-http.test.ts`
  - `src/gateway/run-workers/registry.test.ts`
  - `src/gateway/http-endpoint-helpers.test.ts`
- backend compatibility check passed:
  - `be/src/modules/openclaw/openclaw.service.spec.ts`

Known limitation of Slice 1:

- `/run` still appears to keep normal built-in tools in addition to injected backend-wrapper tools
- `context.allowedResources.tools` is surfaced in prompt text but not fully enforced in code

### Slice 2 — Next Required Work

This is the exact resume point for the next session.

Required next actions:

1. make `/run` runs use **only** injected backend-wrapper tools, not the default coding tool set
2. enforce `context.allowedResources.tools` as a real runtime allowlist in code
3. add focused tests proving:
   - only injected backend-wrapper tools are exposed in `/run`
   - per-request tool narrowing via `allowedResources.tools` works

Recommended files to resume in first:

- `openclaw/src/gateway/run-workers/openclaw-app.ts`
- `openclaw/src/gateway/run-http.ts`
- `openclaw/src/agents/pi-embedded-runner/run/attempt.ts`
- `openclaw/src/gateway/run-http.test.ts`
- add new tests for backend-tool isolation / request-level allowlist enforcement

## Goal

Add the missing app-specific execution layer in `openclaw/` so the backend can call a real `/run` worker that:

- accepts the backend-issued run payload,
- selects one of the three top-level business agents,
- uses backend-wrapper tools to call `/internal/tools/*`,
- returns a final worker response without becoming the system’s security boundary.

## Why This Phase Exists

The backend already behaves like a control plane:

- it authenticates the user,
- resolves access,
- routes the request,
- builds context,
- creates the internal scoped token,
- calls OpenClaw with agent identity and allowed context.

What is still missing is the worker-side implementation that consumes that contract. Right now `openclaw/` is still a generic runtime and does not yet expose the app-specific `/run` surface expected by the backend architecture.

## Target Contract

The worker should accept a request shape equivalent to:

```json
{
  "agentName": "onboarding_assistant",
  "message": "...",
  "context": {
    "user": {},
    "session": {},
    "allowedResources": {
      "documents": [],
      "tools": [],
      "scopes": []
    }
  },
  "internalToken": "...",
  "conversationId": "...",
  "userId": "...",
  "traceId": "...",
  "backendBaseUrl": "..."
}
```

## Phase Scope

### In Scope

- Add an app-specific `/run` worker entrypoint in `openclaw/`.
- Support exactly these top-level business agents:
  - `onboarding_assistant`
  - `learning_training_agent`
  - `training_analytics_agent`
- Inject only the backend-wrapper tools needed for the currently implemented internal endpoints.
- Use the backend-issued `internalToken` and tracing headers on every backend internal API call.
- Keep the worker thin and architecture-aligned.

### Out of Scope

- Full expansion of every documented tool in the architecture docs.
- Reworking the backend control plane again.
- Turning OpenClaw into an authorization boundary.
- Introducing a new ad-hoc access model inside `openclaw/`.

## Design Principles

### Principle 1 — Backend Remains the Authority

The worker must not decide business authorization. It can respect `allowedResources` and local tool injection, but backend remains the real gatekeeper.

### Principle 2 — Use Existing Embedded Runtime

Do not fork or rewrite the generic embedded agent core if it can be avoided. Prefer a thin integration layer on top of the existing embedded runner.

### Principle 3 — Inject App-Specific Tools

The worker should provide only the relevant backend-wrapper tools to the session for the selected business agent. Do not expose generic tool sprawl if it is not needed for this app flow.

### Principle 4 — Keep Agent Model Simple

The three business agents are the top-level worker identities. “Submodules” in the docs should be treated as behavior/prompt organization, not necessarily separate backend-routed agents.

## Planned Deliverables

### Deliverable A — Worker Request/Response Types

Add explicit request/response types for the backend-to-worker contract.

Expected fields:

- selected agent name,
- user/session context,
- internal token,
- backend base URL,
- trace metadata,
- worker output text and any tool-call metadata that should surface back to backend.

### Deliverable B — App-Specific Agent Definitions

Add a small business-agent registry inside `openclaw/` that defines for each top-level agent:

- name,
- system prompt framing,
- allowed backend-wrapper tools,
- behavior notes tied to the documented submodules.

### Deliverable C — Backend-Wrapper Tools

Implement wrapper tools for the currently available backend internal endpoints, including at least:

#### Onboarding

- `get_onboarding_faq`
- `get_support_contacts`
- `get_my_checklist`
- `complete_checklist_task`

#### Training

- `get_training_recommendations`
- `get_my_learning_path`
- `generate_learning_path`
- `generate_quiz`

#### Analytics

- `get_department_training_analytics`

Each wrapper tool must:

- call the backend internal route,
- send `Authorization: Bearer <internalToken>`,
- send `X-Agent-Name`, `X-User-Id`, `X-Conversation-Id`, `X-Trace-Id`,
- map JSON responses into tool results suitable for the embedded agent runtime.

### Deliverable D — `/run` Endpoint

Add a thin HTTP endpoint or equivalent worker entry surface in `openclaw/` that:

1. validates the request payload,
2. selects the business agent definition,
3. creates the injected backend-wrapper tools,
4. runs the embedded agent turn,
5. returns the final response to backend.

### Deliverable E — Focused Tests

Add focused tests that prove:

- the worker accepts the backend payload shape,
- the correct business agent is selected,
- wrapper tools build the correct backend internal API requests,
- tracing and identity headers are forwarded,
- the worker returns a final assistant response in the expected format.

## File-Level Plan

The exact filenames may shift slightly based on existing `openclaw/` patterns, but the intended structure is:

### New or Updated Worker Files

- `openclaw/src/...` worker request/response schema file
- `openclaw/src/...` business agent registry/config file
- `openclaw/src/...` backend-wrapper tool factory file
- `openclaw/src/...` `/run` worker handler file
- `openclaw/src/...` tests for worker payload handling and tool calls

### Likely Existing Runtime Reuse

- embedded runner entrypoints already present in `openclaw/src/agents/pi-embedded-runner/*`
- shared tool definitions/adapters already present in `openclaw/src/agents/*`

### Minimal Backend Touches If Needed

- only if contract mismatches appear during worker implementation
- no broad backend redesign should happen in this phase

## Execution Steps

## TDD Rule for This Phase

Every step below should begin with the narrowest failing test or fixture:

1. write or update the failing worker/spec test,
2. implement the smallest code slice,
3. rerun only the affected test,
4. after several slices pass, run the broader phase verification block.

### Step 1 — Define Worker Contract

- Create request/response types and validation.
- Lock down required and optional fields.
- Ensure direct compatibility with the existing backend payload.

**QA scenario**

- Tool: `npm test`
- Workdir: `openclaw/`
- Command: targeted spec for worker payload validation, for example a dedicated `run-worker.contract.test.ts`
- Concrete steps:
  1. send a valid fixture payload matching backend `OpenclawService.run()` shape,
  2. send one payload missing `agentName`,
  3. send one payload missing `internalToken`.
- Expected result:
  - valid payload is accepted,
  - invalid payloads fail with structured validation error behavior.

### Step 2 — Define Business Agent Registry

- Create a simple registry for 3 business agents.
- Attach prompt framing and allowed wrapper-tool names.
- Map documented submodules into guidance text, not separate routed agent identities.

**QA scenario**

- Tool: `npm test`
- Workdir: `openclaw/`
- Command: targeted spec for business-agent registry lookup
- Concrete steps:
  1. resolve `onboarding_assistant`, `learning_training_agent`, and `training_analytics_agent`,
  2. request an unknown agent id.
- Expected result:
  - the 3 known agents return registry entries with expected tool sets,
  - unknown agent id fails cleanly.

### Step 3 — Build Backend API Tool Client

- Centralize backend HTTP invocation logic.
- Enforce header construction from the incoming run payload.
- Normalize success/error payload handling.

**QA scenario**

- Tool: `npm test`
- Workdir: `openclaw/`
- Command: targeted spec for backend API client
- Concrete steps:
  1. mock an internal API success response,
  2. assert request includes `Authorization`, `X-Agent-Name`, `X-User-Id`, `X-Conversation-Id`, and `X-Trace-Id`,
  3. mock a backend error response.
- Expected result:
  - headers and URL are correct,
  - success payload is normalized,
  - backend error is surfaced in a controlled way.

### Step 4 — Implement Wrapper Tools

- Build tool definitions for the currently implemented backend internal routes.
- Return readable tool results for the embedded runtime.

**QA scenario**

- Tool: `npm test`
- Workdir: `openclaw/`
- Command: targeted wrapper-tool tests
- Concrete steps:
  1. call onboarding wrapper tool and assert correct onboarding endpoint is hit,
  2. call training wrapper tool and assert correct training endpoint is hit,
  3. call analytics wrapper tool and assert correct analytics endpoint is hit.
- Expected result:
  - each tool forwards to the correct backend route,
  - result shape is accepted by the embedded runtime adapter,
  - errors are readable and not swallowed.

### Step 5 — Wire `/run` to Embedded Runtime

- Build a thin worker handler that:
  - chooses the correct business agent,
  - injects the correct tools,
  - runs a single turn via the embedded runtime,
  - returns the response to backend.

**QA scenario**

- Tool: `npm test`
- Workdir: `openclaw/`
- Command: worker integration-style spec for `/run`
- Concrete steps:
  1. send a fixture `/run` request for `onboarding_assistant`,
  2. mock a tool-backed successful reply,
  3. assert returned payload includes normalized final text and expected metadata.
- Expected result:
  - worker responds with success,
  - correct agent/tool set is used,
  - final response can be consumed by backend without contract patching.

### Step 6 — Add Focused Tests

- Test request validation.
- Test agent selection.
- Test backend-wrapper HTTP behavior.
- Test end-to-end worker result shaping at the unit/integration boundary.

**QA scenario**

- Tool: `npm test`
- Workdir: `openclaw/`
- Command: the combined targeted worker test command for all new specs
- Expected result: all focused worker specs pass together without network flakiness.

### Step 7 — Verify

- diagnostics on changed `openclaw/` files,
- focused `openclaw/` tests,
- backend compatibility check if any backend contract file changes.

**QA scenario**

- Tool: `lsp_diagnostics`
- Target: all changed `openclaw/` files
- Expected result: no diagnostics

- Tool: `npm run build`
- Workdir: `openclaw/`
- Expected result: worker code compiles cleanly

- Tool: `npm test`
- Workdir: `openclaw/`
- Command: targeted worker and wrapper-tool specs
- Expected result: all new tests pass

- Tool: `npm test`
- Workdir: `be/`
- Command: targeted `openclaw.service.spec.ts` or any contract-level backend spec affected by worker response shape
- Expected result: backend/OpenClaw contract remains compatible

## Atomic Commit Strategy

If commits are requested later, use this atomic sequence:

1. `feat(openclaw): add run worker request contract and business agent registry`
2. `feat(openclaw): add backend internal api client and wrapper tools`
3. `feat(openclaw): wire /run worker to embedded runtime`
4. `test(openclaw): add worker payload and wrapper tool coverage`
5. `test(be): adjust backend contract coverage if worker response shape changes`

## Acceptance Criteria

- Backend can call a real app-specific OpenClaw `/run` surface.
- The worker supports exactly 3 business agents.
- Worker tools call backend internal APIs with the scoped token and tracing headers.
- `/run` exposes only the intended backend-wrapper tools for the active request.
- `context.allowedResources.tools` is enforced in code.
- The worker does not invent a second authorization layer.
- The focused worker tests pass.
- No new diagnostics are introduced in changed files.

## What Is Already Satisfied vs Not Yet Satisfied

### Already Satisfied

- Backend can call a real app-specific OpenClaw `/run` surface.
- The worker supports exactly 3 business agents.
- Worker tools call backend internal APIs with the scoped token and tracing headers.
- Focused worker tests pass for the current slice.
- No diagnostics were reported on changed files.

### Not Yet Satisfied

- `/run` still needs tool isolation against built-in default tools.
- `context.allowedResources.tools` still needs hard enforcement.
- richer end-to-end backend↔worker↔tool validation is still missing.

## Risks

### Risk 1 — Overusing Generic OpenClaw Surface Area

If the implementation leans too heavily on generic OpenClaw tooling, the result may drift from the repo’s intended app architecture.

### Risk 2 — Tool Result Shape Mismatch

Wrapper tools need to translate backend JSON into a shape that the embedded runtime and downstream backend caller both tolerate.

### Risk 3 — Hidden Contract Drift

If backend currently expects a slightly different `/run` response than the worker returns, a small backend contract patch may still be required.

## Exit Criteria

- Thin worker exists and is callable.
- Wrapper tools work for the currently implemented internal endpoints.
- Tool request headers are correct.
- Focused tests pass.
- Built-in default tools are excluded from `/run` unless explicitly intended.
- Request-level tool narrowing is enforced.
- Remaining incompleteness is limited to the broader future tool matrix.

## Resume Notes for Next Session

When resuming in a fresh session:

- start from **Slice 2**, not from the beginning of Phase 2
- preserve the current `/run` handler and worker registry structure
- do not redesign gateway auth
- do not reopen backend phase-1 work
- treat any failure in broad generic `openclaw` suites carefully; prioritize the focused `/run` worker boundary tests first
