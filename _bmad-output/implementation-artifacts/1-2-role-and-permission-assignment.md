# Story 1.2: Role & Permission Assignment

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Security Admin,
I want to view the employee directory and assign specific roles to individuals,
So that I can control exactly who has access to which AI Agents.

## Acceptance Criteria

1. **Given** an Admin is logged into the system
2. **When** they navigate to the "Role Management" dashboard
3. **Then** they should see a list of users fetched from the Postgres database
4. **And** they can toggle specific permissions (e.g., enable/disable `training_analytics_agent` access) for any user and save successfully.

## Technical Requirements & Developer Context

### Architecture Compliance
- **Frontend (Vite+React):**
  - Build UI for Role Management Dashboard. Use Tailwind CSS v4 and Shadcn UI / Radix primitives.
  - State management uses Zustand & TanStack Query (`useQuery` for listing users, `useMutation` for toggles).
  - Loading states must use standard naming like `isLoading`, `isSaving`.
- **Backend (NestJS + Prisma):**
  - Create REST APIs for listing users and updating their roles/agent access.
  - Expected Endpoints: `GET /api/users` and `PUT /api/users/:id/access` (or similar standard REST endpoints using `kebab-case`).
  - Use Prisma ORM. Models involved should map to `users`, `roles`, `user_roles`, `user_agent_access` (based on AGENTS.md data schema).
  - Only Admins can hit these endpoints. Create an `AdminGuard` (or use existing RBAC) to ensure standard employees get HTTP 403 Forbidden.
  - API Responses must be wrapped: `{ "data": <payload>, "meta": { "traceId": "..." } }`.
  - Errors must throw standard NestJS exceptions (e.g., `ForbiddenException`, `NotFoundException`).
  - `traceId` should be handled systemically and returned in responses.

### File Structure Requirements
- `fe/src/pages/RoleManagementPage.tsx`
- `fe/src/services/userService.ts` (for API calls)
- `be/src/modules/users/` (NestJS module for user/role management)
- `be/src/core/guards/` (for Admin authorization check implementation)

### Database (Prisma)
- Adhere strictly to naming conventions:
  - Model Name: `PascalCase` format (e.g., `UserAgentAccess`).
  - Table Name: `@@map('snake_case_plural')` (e.g., `@@map('user_agent_access')`).
  - Column Name: `camelCase` in TS, mapped to `@map("snake_case")` in schema.
- Expose relations if necessary to fetch user's agent access rights.

### Previous Story Intelligence (From Story 1.1)
- **Learnings:**
  - Login flow successfully issues JWT with roles. Validate that the logged-in user has 'Admin' role before granting access on BOTH frontend routing and backend guard.
  - Frontend uses Tailwind CSS v4. Stick to custom classes or Shadcn for UI consistency.
  - The shared HTTP exception filter is correctly processing NestJS generic exceptions into the wrapper structure; rely on it instead of custom error returns.
  - Inactive/soft-deleted users were blocked at login. Consider showing account status (active/inactive) in the admin's directory view.

## Project Context Reference
- The system relies on strictly separating external user API routes and internal AI tool routes. This story is purely BE<->FE (External REST API) for Admin administration tasks. 
- Backend is the Security Boundary (RULE-02). Do not hardcode permission checks into FE logic except for hiding/showing buttons and redirecting unprivileged users contextually.
- Remember `AGENTS.md` Rule 8: Agent tools correspond to the specific allowed access for that agent. The admin toggle explicitly controls `user_agent_access` granting capabilities per agent.

## Tasks / Subtasks

- [x] Task 1: Backend Setup for Role Management (AC 3, 4)
  - [x] Update Prisma schema to ensure `User`, `Role`, and `UserAgentAccess` models exist per `AGENTS.md`.
  - [x] Create `UsersModule`, `UsersController`, and `UsersService` in `be/src/modules/users`.
  - [x] Implement `GET /api/users` endpoint to fetch user list with Roles and Agent Access.
  - [x] Implement `PUT /api/users/:id/access` to update a user's agent access rights.
  - [x] Create an `AdminGuard` in `be/src/core/guards/admin.guard.ts` to block non-admins.
- [x] Task 2: Frontend Setup for Role Management Dashboard (AC 1, 2)
  - [x] Create `fe/src/services/userService.js` mapping to backend endpoints using `axios`/fetch wrapper.
  - [x] Create `fe/src/pages/RoleManagementPage.jsx` mimicking a dashboard interface with Tailwind v4 + Shadcn UI primitive styles.
  - [x] Build a filterable/sortable table or list of users rendering real data from `GET /api/users`.
  - [x] Implement a toggle/checkbox interface to modify specific `training_analytics_agent` permissions using `PUT /api/users/:id/access`.
- [x] Task 3: Security & E2E Verification (AC 1, 2, 3, 4)
  - [x] Validate standard format wrapper `{ data: ..., meta: { traceId: ... } }` in backend user controller responses.
  - [x] Ensure non-admins are redirected or denied access in both FE (ProtectedRoute/routing) and BE (`AdminGuard`).
  - [x] Run backend tests and frontend review to ensure no regressions from Story 1.1 login mechanisms.

## Dev Agent Record

### Debug Log
- Confirmed role-management responses already inherit the standard `{ success, data, meta.traceId }` wrapper from the global success interceptor, so the missing work was concentrated in admin authorization resilience and the FE management workflow.
- Hardened the backend role-management path with `UpdateUserAccessDto` validation and an `AdminGuard` that accepts both JWT role payloads and flattened `roleCode` session shapes.
- Completed the missing UI behavior on the dashboard by adding filtering, sorting, visible account status, and an explicit saving state for agent-access toggles.

### Completion Notes
- `RoleManagementPage.jsx` now supports filtering by name/email/role/status and sorting by name, role, or status, which closes the missing “filterable/sortable list” requirement from the story.
- Added `UpdateUserAccessDto` plus updated controller tests so `PUT /api/users/:id/access` is validated structurally before the service mutates `user_agent_access`.
- Added `AdminGuard` unit coverage to verify both `role.code` and `roleCode` admin payload shapes continue to work without false denials.

## File List
- `be/src/modules/users/users.controller.ts`
- `be/src/modules/users/users.controller.spec.ts`
- `be/src/modules/users/dto/update-user-access.dto.ts`
- `be/src/core/guards/admin.guard.ts`
- `be/src/core/guards/admin.guard.spec.ts`
- `fe/src/pages/RoleManagementPage.jsx`

## Change Log
- `2026-03-22`: Completed the remaining story 1.2 gaps by validating update-access payloads, strengthening admin guard compatibility, and adding filter/sort/status UX to the role management dashboard.

## Completion Status
Ultimate context engine analysis completed - comprehensive developer guide created.
