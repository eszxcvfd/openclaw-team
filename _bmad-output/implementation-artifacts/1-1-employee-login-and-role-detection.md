# Story 1.1: Employee Login & Role Detection

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an Employee,
I want to log in using my internal system credentials and have my Role/Department recognized,
so that I can securely access the OpenClaw platform tailored to my permissions.

## Acceptance Criteria

1. **Given** an employee opens the OpenClaw web portal
2. **When** they submit valid email and password credentials
3. **Then** the system should log them in and issue a JWT `user_access_token`
4. **And** the UI should redirect them to the chat dashboard displaying their recognized Role and Department.

## Tasks / Subtasks

- [x] Task 1: Initialize Project Structure (AC: #1)
  - [x] Bootstrap the frontend (`npm create vite@latest fe -- --template react-ts`)
  - [x] Bootstrap the backend (`npx @nestjs/cli new be --strict --package-manager npm`)
  - [x] Configure TailwindCSS v4 for `fe/`
  - [x] Initialize Prisma ORM for `be/`
- [x] Task 2: Backend Database Schema & Auth Module (AC: #2, #3)
  - [x] Create the Prisma schema for the `users` table (`@@map('users')`, `id`, `email`, `password`, `role`, `department`, etc.)
  - [x] Build `AuthModule` and `AuthController` for the `POST /auth/login` endpoint
  - [x] Validate email/password credentials and issue `user_access_token` + `refresh_token` (JWT)
  - [x] Define the `user_access_token` payload to include Role and Department
  - [x] Set up a standard exception filter instead of returning ad hoc `{ error: true }` objects
- [x] Task 3: Frontend Login UI & State Management (AC: #1, #2, #4)
  - [x] Create the Login screen using form components from Shadcn UI or Radix
  - [x] Configure a Zustand store for the user session (`fe/src/store/authStore.ts`)
  - [x] Call the login API through a fetch/axios service integrated with TanStack Query
  - [x] Redirect to the Chat Dashboard after a successful login
  - [x] Display the user's Role and Department in the Header/Sidebar of the Chat Dashboard layout

## Dev Notes

- **Foundation stage:** This story establishes the initial project foundation and is the first implementation priority. Ensure the two top-level folders, `fe/` and `be/`, are created under `openclaw-team/` according to the approved architecture.
- **Database design (Prisma):**
  - Model name: `User` (`PascalCase`)
  - Table name: `users` (`@@map('users')`)
  - Column name example: `createdAt` (`@map("created_at")`)
- **API endpoint and naming:**
  - `POST /auth/login` is a REST endpoint. Successful responses must use the wrapper format `{ "data": <payload>, "meta": { "traceId": "..." } }`.
  - Do not send `traceId` inside the request JSON body. The backend should generate it or read it from HTTP headers, then return it in the response.
- **Rules from `AGENTS.md` / architecture:**
  - The frontend must not hardcode Role/Permission logic. That responsibility belongs to the backend.
  - Frontend loading state variables should use standard naming such as `isLoading` and `isSubmitting`. Boolean variables should use the `is` prefix.
  - The backend must throw standard HTTP exceptions (for example, `UnauthorizedException`) and let the filter handle the response. Do not scatter custom error-return objects throughout the code.

### Project Structure Notes

- Alignment with the unified project structure:
  - `fe/` should contain React Router setup, Zustand state (`src/store`), and React Query hooks/services (`src/hooks`, `src/services`).
  - `be/` should be organized into NestJS modules, prioritizing the auth module (`src/auth/auth.module.ts`) and Prisma configuration (`prisma/schema.prisma`).
- Naming conventions:
  - Use `camelCase` for JSON response properties.
  - Use `PascalCase.tsx` for React components.
  - Use `kebab-case` for URL endpoints.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 1.1: Employee Login & Role Detection]
- [Source: _bmad-output/planning-artifacts/architecture.md#Starter Template Evaluation]
- [Source: AGENTS.md#API Decisions & Frontend/Backend Layering]

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- 2026-03-22 14:20 ICT: Started implementing the story, confirmed it was the selected story from `sprint-status.yaml`, and moved tracking to `in-progress`.
- 2026-03-22 14:22 ICT: Completed the auth flow for `POST /auth/login`, expanded unit/integration tests to verify the JWT access payload includes role/department, and ensured the response wrapper returns a standard trace ID.
- 2026-03-22 14:22 ICT: Replaced the frontend starter screen with a login screen using Radix Form, TanStack Query, and Zustand; added a protected chat dashboard and proxy support for external API routes.
- 2026-03-22 14:22 ICT: Ran `npm test` and `npm run build` in `be/`, then ran `npm run lint` and `npm run build` in `fe/`; all checks passed.
- 2026-03-22 14:41 ICT: Addressed code review findings by removing insecure JWT secret fallbacks, blocking inactive and soft-deleted users from logging in, preferring the newest role assignment, and fixing the fallback 500 error message.
- 2026-03-22 14:41 ICT: Expanded backend auth tests for inactive users, soft-deleted users, missing JWT secrets, and multi-role role selection; reran backend tests/build plus frontend lint/build successfully.

### Completion Notes List

- Completed the frontend login flow with routing, a persisted auth session store, a React Query mutation, and redirect to `/chat` after successful backend authentication.
- The dashboard clearly displays `role`, `roleCode`, `department`, and `departmentCode` from the backend response; the frontend does not hardcode permissions.
- Enabled TailwindCSS v4 for `fe/` via the Vite plugin while preserving custom CSS for the login/dashboard layout.
- Strengthened backend auth tests to verify that the access token payload contains role/department and that the response always returns the token bundle inside the standard wrapper.
- Removed insecure JWT signing secret fallbacks so the login flow fails closed when auth secrets are not configured.
- Blocked authentication for inactive and soft-deleted accounts while keeping the unauthorized response standardized.
- Updated role resolution to prefer the most recently assigned role and added regression coverage for multi-role users.
- Fixed the corrupted fallback internal error message in the shared HTTP exception filter.

### File List

- `be/src/common/filters/http-exception.filter.ts`
- `be/src/modules/auth/auth.service.ts`
- `be/src/tests/integration/auth.controller.spec.ts`
- `be/src/tests/unit/auth.service.spec.ts`
- `fe/src/App.css`
- `fe/src/App.jsx`
- `fe/src/components/ProtectedRoute.jsx`
- `fe/src/hooks/useLoginMutation.js`
- `fe/src/index.css`
- `fe/src/main.jsx`
- `fe/src/pages/ChatDashboardPage.jsx`
- `fe/src/pages/LoginPage.jsx`
- `fe/src/router.jsx`
- `fe/src/services/apiClient.js`
- `fe/src/services/authService.js`
- `fe/src/store/authStore.js`
- `fe/vite.config.js`

### Change Log

- 2026-03-22: Completed Story 1.1 with backend login/auth token payloads carrying clear role-department data, the frontend login/dashboard flow, and passing backend/frontend validation checks.
- 2026-03-22: Addressed code review follow-ups for auth hardening, role selection, exception message cleanup, and expanded backend regression coverage.
