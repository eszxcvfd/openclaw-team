# OpenClaw System Alignment Plan Index

## Purpose

This folder tracks the phased plan for aligning the repository with the documented architecture in `AGENTS.md`:

- Backend remains the control plane.
- OpenClaw acts as a worker, not the security boundary.
- Tool calls flow through backend internal APIs.
- Top-level business agents are limited to:
  - `onboarding_assistant`
  - `learning_training_agent`
  - `training_analytics_agent`

## Phase Status

| Phase | File | Status | Summary |
|---|---|---|---|
| Phase 1 | `phase-1-backend-control-plane.md` | Completed | Backend agent normalization and internal tool allowlist hardening |
| Phase 2 | `phase-2-openclaw-run-worker.md` | In Progress | `/run` worker slice 1 completed; tool-isolation and allowlist-enforcement slice still pending |
| Phase 3 | `phase-3-hardening-and-completion.md` | Planned | Remove heuristic access logic, fail-closed behavior, expand tests and remaining coverage |

## Execution Order

1. Complete backend control-plane consistency and enforcement.
2. Add OpenClaw worker surface that consumes backend-issued contracts.
3. Finish hardening and broader architectural completeness work.

## Current Executable Unit

The current executable unit is:

- **Phase 2 — OpenClaw `/run` Worker and Backend-Wrapper Tools**

Phase 1 is already complete. Phase 3 is explicitly blocked on Phase 2 being implemented and verified.

## Resume Point for New Session

If a new session needs to continue from the current checkpoint, resume from:

- **Phase 2, Slice 2**
- Goal: tighten `/run` so it exposes **only injected backend-wrapper tools** and enforces `context.allowedResources.tools` in code
- Do **not** reopen Phase 1 unless a backend/OpenClaw contract mismatch appears
- Do **not** start Phase 3 yet

## Current Done / Remaining Snapshot

### Done

- Phase 1 fully completed and verified
- Phase 2 slice 1 completed:
  - typed `/run` request handling exists
  - 3 business-agent registry exists
  - backend-wrapper tools exist for current onboarding/training/analytics internal endpoints
  - embedded runner can receive executable injected tools
  - focused worker tests pass
  - `openclaw/` build passes

### Remaining Before Phase 2 Can Be Marked Complete

- restrict `/run` executions to injected backend-wrapper tools only
- enforce `context.allowedResources.tools` in code, not only in prompt text
- add focused tests for those two boundaries
- optionally add backend-tool header/request mapping tests if not already covered by the new boundary tests

## TDD Execution Rule

For every future phase implementation step:

1. add or update the narrowest failing test first,
2. implement the minimum code needed to make it pass,
3. run focused verification for that step,
4. then move to the next step.

## Atomic Commit Strategy

When commit creation is requested later, use one atomic commit per completed work slice:

1. `plan: document backend/openclaw alignment phases`
2. `feat(openclaw): add /run worker contract and business agent registry`
3. `feat(openclaw): add backend-wrapper tool client and onboarding/training/analytics wrappers`
4. `test(openclaw): add worker payload and wrapper tool tests`
5. `refactor(be): remove heuristic access checks and fail closed on uncatalogued internal tools`
6. `test(e2e): cover backend-to-openclaw worker flow`

Commits should only be created when explicitly requested.

## QA Scenarios

### Phase 2 QA Gate

- Tool: `npm test`
- Workdir: `openclaw/`
- Command shape: targeted Vitest/Jest command for the new worker and wrapper-tool specs
- Expected result: all new worker contract and tool-forwarding tests pass

- Tool: `npm run build`
- Workdir: `openclaw/`
- Expected result: worker files compile with no type errors

### Phase 3 QA Gate

- Tool: `npm test`
- Workdir: `be/`
- Expected result: policy/access and end-to-end flow specs pass after heuristic removal and fail-closed tightening

- Tool: `npm run build`
- Workdir: `be/`
- Expected result: backend compiles after hardening changes

## Notes

- Phase 1 is already implemented and verified in the backend codebase.
- Phase 2 should be executed as a separate implementation stream.
- Phase 3 should not begin until Phase 2 is working end-to-end.
