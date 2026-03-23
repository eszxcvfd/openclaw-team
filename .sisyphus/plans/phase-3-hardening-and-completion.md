# Phase 3 — Hardening and Architectural Completion

## Status

**Planned**

Blocked by: **Phase 2 not finished yet**

## Goal

Finish the remaining architecture gaps after phases 1 and 2 by removing policy shortcuts, tightening failure modes, and expanding verification to the full intended backend-controlled agent flow.

## Why This Phase Exists

Even after a successful backend control-plane fix and a future working OpenClaw worker, the system would still not be fully aligned with the architecture docs unless the remaining shortcuts are removed.

This phase is the final hardening pass.

## Explicit Prerequisite

Do not start this phase until **Phase 2 is implemented, merged, and verified**.

Blocked dependencies:

- app-specific OpenClaw `/run` worker exists,
- backend-wrapper tools exist for the supported internal endpoints,
- worker tests and compile checks pass,
- `/run` is restricted to intended injected tools,
- request-level worker tool allowlist enforcement is in place.

## Current Blocker Marker

Do not start this phase yet.

Reason:

- Phase 2 slice 1 is complete,
- but Phase 2 slice 2 still remains,
- so the OpenClaw worker boundary is not yet strict enough for hardening work to begin.

## Main Outcomes

### Outcome 1 — Replace Role Heuristics with Policy/Permission Logic

Current code still contains role-name heuristics in some access decisions. Those should move to centralized policy/permission-backed decisions to match the architecture rule that permissions must not be hardcoded ad hoc.

Targets include:

- `be/src/modules/agent-router/agent-router.service.ts`
- `be/src/modules/analytics/analytics.service.ts`
- any other service discovered to rely on role-name regex or string checks

### Outcome 2 — Make Internal Tool Authorization Fail Closed

If an internal route is protected but missing from the backend API catalog or agent/tool mapping, the backend should deny access instead of drifting into partial metadata behavior.

The final rule should be:

- no catalog entry → deny,
- catalog entry without allowlist entry → deny,
- header/token mismatch → deny,
- scope mismatch → deny.

### Outcome 3 — Expand Tool Matrix Toward Documented Coverage

After the worker path is live, expand support toward the documented tools and internal routes that are still absent or only partially represented.

This includes deciding which of the architecture-documented tools are:

- already implemented in backend,
- missing in backend,
- missing only in `openclaw/` wrapper layer,
- intentionally deferred.

### Outcome 4 — Add End-to-End Validation

The most important missing verification after phase 2 will be true flow coverage:

`chat request -> backend routing -> context build -> token issue -> OpenClaw /run -> backend internal tool call -> final response`

This phase should add focused integration or end-to-end tests for that path.

## Detailed Work Plan

### Workstream A — Policy Cleanup

- inventory every place where role strings are used directly,
- classify whether each instance is acceptable, transitional, or architecturally wrong,
- replace incorrect heuristics with policy-service or permission-backed logic.

**QA scenario**

- Tool: `npm test`
- Workdir: `be/`
- Command: targeted specs for router and analytics access logic
- Concrete steps:
  1. add failing tests that prove role-name heuristics are no longer accepted as the access source of truth,
  2. replace logic with permission/policy-backed checks.
- Expected result:
  - tests pass only when permission-backed access works,
  - heuristic-only cases are rejected.

### Workstream B — Tool Catalog Strictness

- review `backend_api_catalog`, `tools`, and `agent_group_tools` expectations,
- update guard behavior so uncatalogued internal routes cannot be called by internal agents,
- add tests proving fail-closed behavior.

**QA scenario**

- Tool: `npm test`
- Workdir: `be/`
- Command: targeted guard and internal-tool audit specs
- Concrete steps:
  1. call a catalogued allowlisted route,
  2. call a catalogued but non-allowlisted route,
  3. call a guarded uncatalogued route.
- Expected result:
  - allowlisted route succeeds,
  - non-allowlisted route fails,
  - uncatalogued route also fails closed.

### Workstream C — Tool Matrix Reconciliation

- compare architecture docs to actual backend internal controllers and services,
- create a matrix of:
  - implemented and wired,
  - implemented but not wired to OpenClaw,
  - documented but not implemented,
- deprecated/not needed.

**QA scenario**

- Tool: manual document review plus repo reads
- Concrete steps:
  1. compare `AGENTS.md` tool matrix to backend internal controllers and worker wrapper-tool registry,
  2. record each documented tool as implemented, wired, missing, or deferred.
- Expected result:
  - a written matrix exists,
  - no implemented tool is left unclassified.

### Workstream D — End-to-End Tests

- add tests or harnesses that cover the full worker flow,
- ensure trace IDs and headers survive the whole chain,
- ensure internal tool audit logging is produced for successful and denied calls,
- validate sticky conversation agent behavior still works after worker integration.

**QA scenario**

- Tool: `npm test`
- Workdir: `be/` and/or integration harness location
- Command: targeted end-to-end or integration spec for chat → backend → OpenClaw worker → internal tool → final response
- Concrete steps:
  1. send a chat request fixture,
  2. force the routed agent to call one backend-wrapper tool,
  3. assert trace headers and final assistant response,
  4. assert audit log write occurred.
- Expected result:
  - the full flow succeeds,
  - traceability is preserved,
  - audit logging occurs for the tool call.

## TDD Rule for This Phase

Each workstream must proceed in this order:

1. add the failing policy/guard/e2e spec first,
2. implement the minimum change to make it pass,
3. rerun only that slice,
4. after all slices are green, run the broader final verification wave.

## Atomic Commit Strategy

If commits are requested later, use this atomic sequence:

1. `refactor(be): replace role heuristics with policy-backed access checks`
2. `fix(be): fail closed for uncatalogued internal tool routes`
3. `docs(plan): reconcile documented and implemented tool matrix`
4. `test(e2e): add backend to openclaw worker flow coverage`

## Expected Files to Touch

### Backend

- policy/access services and any remaining role-heuristic consumers
- internal-agent guard and tool metadata resolution if fail-closed behavior is tightened
- tests covering policy and end-to-end behavior

### OpenClaw

- worker/tool files as needed for any additional documented tools
- worker tests for expanded tool coverage

### Planning / Documentation

- update the plan index and phase status once the system is closer to full architecture compliance

## Acceptance Criteria

- no important access decisions rely on ad-hoc role-name heuristics,
- internal tool authorization fails closed,
- worker and backend support the agreed tool matrix,
- at least one realistic end-to-end request path is tested,
- the system behavior matches the architecture docs closely enough to stop calling it transitional.

## Deferred Questions to Resolve During This Phase

- Which documented tools are intentionally not part of the MVP?
- Should submodule behavior stay prompt-only, or should some capabilities become explicit worker sub-agents later?
- Which end-to-end harness is the least brittle for this repo?

## Recommendation

Do not start this phase until phase 2 is implemented and verified. The value of this phase depends on the worker path being real first.
