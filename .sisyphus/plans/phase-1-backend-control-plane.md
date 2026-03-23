# Phase 1 — Backend Control Plane Alignment

## Status

**Completed**

## Goal

Bring the backend closer to the documented architecture by making the backend the consistent source of truth for:

- top-level agent identity,
- runtime-to-database agent mapping,
- internal tool authorization decisions,
- context and conversation agent consistency.

This phase intentionally stops at the backend control plane. It does **not** implement the missing app-specific OpenClaw worker runtime.

## Why This Phase Existed

Before this phase, the repository had a mismatch between:

- runtime-facing agent identifiers such as `onboarding_assistant`, and
- database-seeded `agent_groups.code` values such as `onboarding`.

That mismatch leaked into multiple backend services and made the architecture less reliable than the docs implied. There was also a gap where internal tool access was effectively checked by scope, but not fully enforced against the database-backed agent/tool allowlist.

## Files Added or Changed

### Added

- `be/src/modules/agent-router/agent-registry.ts`

### Changed

- `be/src/modules/agent-router/agent-router.service.ts`
- `be/src/modules/chat/conversation.service.ts`
- `be/src/modules/context-builder/context-builder.service.ts`
- `be/src/modules/users/users.service.ts`
- `be/src/modules/analytics/analytics.service.ts`
- `be/src/modules/tool-gateway/tool-call-log-metadata.resolver.ts`
- `be/src/modules/auth/guards/internal-agent.guard.ts`

### Tests Updated

- `be/src/modules/analytics/analytics.service.spec.ts`
- `be/src/modules/context-builder/context-builder.service.spec.ts`
- `be/src/modules/auth/guards/internal-agent.guard.spec.ts`
- `be/src/modules/tool-gateway/tool-call-log-metadata.resolver.spec.ts`

## Detailed Work Completed

### 1. Shared Agent Registry Added

Created a single registry file to define the canonical mapping between:

- runtime agent IDs:
  - `onboarding_assistant`
  - `learning_training_agent`
  - `training_analytics_agent`
- database agent group codes:
  - `onboarding`
  - `learning_training`
  - `training_analytics`

The registry also centralizes phase-scoped routing metadata:

- keyword profiles,
- allowed tool names,
- allowed scopes,
- submodule labels.

**QA scenario**

- Tool: `npm test`
- Workdir: `be/`
- Command: `npm test -- --runInBand src/modules/agent-router/agent-router.service.spec.ts`
- Expected result: router tests pass while using the canonical runtime agent IDs resolved from shared registry data

### 2. Router Logic Normalized

Updated `agent-router.service.ts` to use the registry instead of hardcoded scattered assumptions. This made routing decisions consistent with the canonical runtime agent IDs while still respecting database-backed agent access.

**QA scenario**

- Tool: `lsp_diagnostics`
- Target: `be/src/modules/agent-router/agent-router.service.ts`
- Expected result: no diagnostics

- Tool: `npm test`
- Workdir: `be/`
- Command: `npm test -- --runInBand src/modules/agent-router/agent-router.service.spec.ts`
- Expected result: route selection and sticky-agent behavior tests pass

### 3. Conversation and Context Alignment Fixed

Updated conversation persistence and context building so backend services can safely move between:

- runtime agent codes used in prompts/OpenClaw requests, and
- DB agent group codes stored in `agent_groups` and conversation rows.

This prevents silent mismatches when:

- creating or reusing a conversation,
- building prompt context,
- rehydrating session state.

**QA scenario**

- Tool: `npm test`
- Workdir: `be/`
- Command: `npm test -- --runInBand src/modules/context-builder/context-builder.service.spec.ts src/modules/chat/conversation.service.spec.ts`
- Expected result: context and conversation tests pass using normalized runtime↔DB agent codes

### 4. User Access Updates Normalized

Updated `users.service.ts` so admin-style agent-access writes normalize incoming agent identifiers before database lookup/upsert. This allows the backend to accept runtime-facing names while still writing the correct DB agent group entries.

**QA scenario**

- Tool: `lsp_diagnostics`
- Target: `be/src/modules/users/users.service.ts`
- Expected result: no diagnostics

- Tool: `npm test`
- Workdir: `be/`
- Command: `npm test -- --runInBand src/modules/users/users.service.spec.ts`
- Expected result: agent access upsert tests pass with normalized DB group lookup

### 5. Analytics Access Check Aligned

Updated `analytics.service.ts` to compare against the canonical DB code for analytics access rather than mixing runtime names and DB names.

**QA scenario**

- Tool: `npm test`
- Workdir: `be/`
- Command: `npm test -- --runInBand src/modules/analytics/analytics.service.spec.ts`
- Expected result: analytics access tests pass and manager access is evaluated against canonical analytics group code

### 6. Internal Tool Metadata Resolution Hardened

Updated `tool-call-log-metadata.resolver.ts` to resolve tool metadata using normalized DB agent codes. This makes logging and allowlist lookup consistent across internal routes.

**QA scenario**

- Tool: `npm test`
- Workdir: `be/`
- Command: `npm test -- --runInBand src/modules/tool-gateway/tool-call-log-metadata.resolver.spec.ts`
- Expected result: metadata resolver tests pass and normalized agent code lookup resolves correct `agent_group_tools` rows

### 7. Internal Tool Authorization Hardened

Updated `internal-agent.guard.ts` to do more than scope validation.

The guard now also checks whether the current internal route resolves to a backend API entry that is actually allowlisted for the calling agent through `agent_group_tools`.

This is the largest security improvement in this phase because it moves the implementation closer to the documented “agent allowlist + backend enforcement” model.

**QA scenario**

- Tool: `npm test`
- Workdir: `be/`
- Command: `npm test -- --runInBand src/modules/auth/guards/internal-agent.guard.spec.ts src/tests/integration/internal-tool-audit.spec.ts`
- Expected result: denied tool routes fail with `TOOL_ACCESS_DENIED` for non-allowlisted paths and successful internal tool calls still audit correctly

## TDD and Commit Strategy Used

Although this phase is already complete, future replay or extension should follow this order:

1. update failing spec for one backend surface,
2. apply the smallest code change,
3. rerun the targeted spec,
4. only after the slice is green, continue.

If commits are requested later, the atomic commit strategy should be:

1. `refactor(be): add shared agent registry for runtime and db normalization`
2. `fix(be): normalize conversation context and user agent access lookups`
3. `fix(be): enforce internal tool allowlist in internal agent guard`
4. `test(be): update router context analytics and guard specs`

## Verification Completed

### Diagnostics

Ran diagnostics on all edited backend files. Result: **clean**.

### Tests

Ran targeted backend tests covering:

- agent guard behavior,
- tool metadata resolution,
- analytics access logic,
- context building,
- agent router behavior,
- chat/OpenClaw transport layer behavior.

Result: **31 / 31 tests passed**.

### Build

Ran backend build in `be/`.

Result: **passed**.

## What This Phase Explicitly Did Not Do

- Did **not** add the app-specific OpenClaw `/run` worker.
- Did **not** add backend-wrapper tools in `openclaw/`.
- Did **not** fill out the full documented internal tool matrix.
- Did **not** remove all role-name heuristics from backend access checks.
- Did **not** make uncatalogued internal routes fail closed yet.

## Remaining Risks After Phase 1

### Risk 1 — Role Heuristics Still Exist

Some backend decisions still rely on role-name heuristics such as manager/HR/admin-style string matching instead of going fully through centralized permission/policy services.

### Risk 2 — Allowlist Enforcement Is Not Fully Fail-Closed

If an internal route is guarded but missing from the backend API catalog, the current logic is stronger than before but still not the final fail-closed architecture target.

### Risk 3 — Registry Scope Is Phase-Scoped

The registry is correct for the currently implemented subset, but it is not yet the final full tool matrix described in the architecture docs.

## Exit Criteria Achieved

- Shared canonical agent registry exists.
- Runtime↔DB agent normalization is applied in key backend services.
- Internal tool guard checks both scope and DB allowlist for catalogued routes.
- Diagnostics are clean.
- Targeted tests pass.
- Backend build passes.

## Recommendation

Treat this phase as complete and do not reopen it unless:

- phase 2 exposes a contract mismatch, or
- the team decides to fold heuristic-removal work back into backend control-plane hardening.
