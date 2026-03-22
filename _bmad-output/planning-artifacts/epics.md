---
stepsCompleted:
  - 1
  - 2
  - 3
  - 4
workflowType: 'epics-and-stories'
status: 'complete'
inputDocuments:
  - d:\openclaw-team\_bmad-output\planning-artifacts\prd.md
  - d:\openclaw-team\_bmad-output\planning-artifacts\architecture.md
---

# OpenClaw - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for OpenClaw, decomposing the requirements from the PRD, UX Design if it exists, and Architecture requirements into implementable stories.

## Requirements Inventory

### Functional Requirements

FR1: Employee có thể đăng nhập vào hệ thống bằng thông tin tài khoản nội bộ.
FR2: Hệ thống tự động nhận diện Role và Department của người dùng ngay sau khi đăng nhập thành công.
FR3: Ban Bảo mật / Admin có thể đặc tả và phân quyền sử dụng hệ thống từ giao diện quản trị.
FR4: Employee có thể gửi câu hỏi dạng văn bản tới AI Chatbot và nhận phản hồi được cá nhân hóa chặt chẽ theo Context của chính User đó.
FR5: Employee có thể tương tác chọn các "Lệnh gợi ý" (Suggestive Prompts) do giao diện Chatbot cung cấp sẵn.
FR6: Employee có thể tạo đoạn hội thoại mới hoặc xem lại toàn bộ lịch sử trò chuyện cũ.
FR7: Backend tự động thu thập Profile của người dùng để tiêm chung vào prompt trước khi đẩy sang onboarding_assistant.
FR8: Tân binh (New Hire) có thể theo dõi và đánh dấu hoàn thành (Check-off) các Onboarding Tasks của mình bằng chat hoặc nút bấm trên UI chatbot.
FR9: Tân binh có thể thông qua AI để tra cứu nhanh các câu hỏi FAQ, Nội quy, và Danh bạ hỗ trợ IT/HR (Support Contacts).
FR10: Backend tiến hành sinh và đính kèm internal_scoped_token giới hạn thời gian tự động mỗi lần AI muốn lấy dữ liệu.
FR11: System tự động chặn và trả lỗi mọi lệnh từ AI nếu Agent yêu cầu truy xuất vượt quyền hoặc lấy chéo dữ liệu của nhân sự khác.
FR12: Ban Bảo mật có quyền tra soát trực tiếp nhật ký lưu vết chi tiết (kèm traceId, nội dung, kết quả thực thi lỗi) của tất cả Tool Calls do Agent tạo ra.
FR13: Employee có thể nộp kết quả chấm điểm (submit) các bài thi Mini-Quiz do AI gen ra. (Phân khu Growth)
FR14: Employee có thể yêu cầu gợi ý xây dựng Lộ trình Đào tạo (Learning Path) qua tính cá nhân hóa. (Phân khu Growth)
FR15: Manager có thể lấy báo cáo tổng tiến độ đào tạo của chi nhánh cùng kết quả đánh giá phân tích Sentiment sơ bộ. (Phân khu Growth)

### NonFunctional Requirements

NFR1: (Time to First Token - TTFT) Hệ thống phải bắt đầu trả token text đầu tiên cho Chat UI trong vòng tối đa 3 giây tính từ lúc người dùng gửi prompt.
NFR2: (Tool Execution Time) Thời gian chọc Data qua Internal API cho AI không được vượt quá 2 giây/lần gọi.
NFR3: (Graceful Degradation) Nếu Backend hoặc LLM Service của OpenAI gặp sự cố mạng, thay vì đứng khung màn hình, Chatbot phải ngắt luồng và hiển thị thông báo lỗi thân thiện sau tối đa 5 giây.
NFR4: (Retry Mechanism) Các HTTP request backend-to-backend phải hỗ trợ Auto-Retry mạng tối đa 2 lần với lỗi timeout hoặc 503.
NFR5: (Short-lived Tokens) Toàn bộ token cấp tạm cho AI làm công cụ truy cập DB chỉ có tuổi thọ Time-to-Live tối đa 5 phút.
NFR6: (End-to-end Traceability) Từng đoạn hội thoại sẽ được định danh theo UUID (conversationId). Bất kỳ lỗi sinh ra từ FE, BE hay OpenClaw Engine sẽ được đính mã ID này vào Audit Log.
NFR7: (Audit Integrity) Lưu trữ Log cho Tool Calls theo cơ chế Append-only (không cho phép Developer xóa/sửa) để duy trì toàn vẹn dữ liệu điều tra bảo mật.

### Additional Requirements

- [Starter Template Frontend] Vite React TS: npm create vite@latest fe -- --template react-ts
- [Starter Template Backend] NestJS: npx @nestjs/cli new be --strict --package-manager npm
- [Data Caching] Dùng Redis Cluster để lưu trữ ngắn hạn Session Contexts và làm backing cho BullMQ.
- [AI Response Streaming] Bắt buộc định tuyến theo Server-Sent Events (SSE) để giảm latency thay vì Websocket.
- [Rate Limiting] Backend limit request của AI cho từng `userId` trực tiếp qua Redis.
- [API Defense] Bắt buộc sử dụng package `@nestjs/throttler` (v6.5+) trên NestJS Controllers.
- [Database] Dùng PostgreSQL 16 thông qua Prisma ORM (`snake_case_plural` DB mapping, `camelCase` TS models).
- [State Management] Zustand (v5.x) & TanStack Query (v5.x) cho Frontend State.
- [UI Framework] Tailwind CSS v4 & Radix/Shadcn UI primitives.
- [Integration Pattern] SSE endpoint ở Backend yêu cầu `EventSource` parser ở Frontend.

### UX Design Requirements

(No UX Document found based on available context)

### FR Coverage Map

FR1: Epic 1 - Employee login with internal account
FR2: Epic 1 - Role/Department detection upon login
FR3: Epic 1 - Admin role and permission assignment
FR4: Epic 2 - Personalized AI chatbot responses
FR5: Epic 2 - Suggestive Prompts for quick interaction
FR6: Epic 2 - Chat history and new dialog management
FR7: Epic 2 - User profile injection into AI prompt
FR8: Epic 3 - Check-off Onboarding Tasks via UI/Chat
FR9: Epic 3 - Lookup FAQ, company rules, Support Contacts
FR10: Epic 1 - Generation of short-lived internal_scoped_token
FR11: Epic 1 - RBAC enforcement guarding AI data access
FR12: Epic 4 - Audit Log tracing and tool call tracking
FR13: Epic 5 - Mini-Quiz submission and grading
FR14: Epic 5 - Personalized Learning Path generation
FR15: Epic 6 - Sentiment and training progress reports

## Epic List

### Epic 1: Identity & Security Foundation
Thiết lập xương sống bảo mật để nhân viên có thể đăng nhập an toàn vào nền tảng, được phân quyền chính xác và đảm bảo AI Engine bị khóa chặt trong không gian an toàn bằng Token tự hủy.
**FRs covered:** FR1, FR2, FR3, FR10, FR11

### Epic 2: Core AI Chat Experience
Cung cấp khung giao diện Chat mượt mà, phản hồi theo thời gian thực (streaming), nơi AI hiểu rõ bối cảnh cá nhân của nhân viên và cho phép người dùng tra cứu lịch sử hội thoại.
**FRs covered:** FR4, FR5, FR6, FR7

### Epic 3: Onboarding Workspace (MVP Target)
Xây dựng không gian hội nhập tự động, giúp nhân viên mới tự giải đáp các thắc mắc (FAQ, Nội quy) và tự gạch bỏ các Nhiệm vụ Onboarding thông qua AI chatbot mà không cần HR can thiệp kéo dài.
**FRs covered:** FR8, FR9

### Epic 4: AI Security Auditing
Cung cấp một bảng điều khiển lưu vết minh bạch 100% mọi tool calls của AI, giúp Admin dễ dàng truy cứu trách nhiệm khi có sự cố bảo mật (Append-only logs).
**FRs covered:** FR12

### Epic 5: Learning & Training (Phase 2)
Cho phép nhân viên cũ nhận lộ trình học tập thăng tiến tự động và làm các bài kiểm tra mini-test do AI sinh ra trực tiếp.
**FRs covered:** FR13, FR14

### Epic 6: Management Analytics (Phase 2)
Cung cấp bản tóm tắt cảm xúc nhân viên và báo cáo tiến độ học tập toàn chi nhánh cho cấp Quản lý thông qua các lệnh chat AI.
**FRs covered:** FR15

## Epic 1: Identity & Security Foundation
Thiết lập xương sống bảo mật để nhân viên có thể đăng nhập an toàn vào nền tảng, được phân quyền chính xác và đảm bảo AI Engine bị khóa chặt trong không gian an toàn bằng Token tự hủy.

### Story 1.1: Employee Login & Role Detection
As a Employee, I want to log in using my internal system credentials and have my Role/Department recognized, So that I can securely access the OpenClaw platform tailored to my permissions.

**Acceptance Criteria:**
- **Given** an employee opens the OpenClaw web portal
- **When** they submit valid email and password credentials
- **Then** the system should log them in and issue a JWT `user_access_token`
- **And** the UI should redirect them to the chat dashboard displaying their recognized Role and Department.

### Story 1.2: Role & Permission Assignment
As a Security Admin, I want to view the employee directory and assign specific roles to individuals, So that I can control exactly who has access to which AI Agents.

**Acceptance Criteria:**
- **Given** an Admin is logged into the system
- **When** they navigate to the "Role Management" dashboard
- **Then** they should see a list of users fetched from the Postgres database
- **And** they can toggle specific permissions (e.g., enable/disable `training_analytics_agent` access) for any user and save successfully.

### Story 1.3: Internal AI Security Token Generation
As the Backend Orchestrator, I want to automatically generate a short-lived `internal_scoped_token` right before calling the AI Engine, So that the AI has a restricted, temporary passport to query data on behalf of the user.

**Acceptance Criteria:**
- **Given** a user sends a chat message that needs AI reasoning
- **When** the Backend prepares to forward the message to the OpenClaw Engine
- **Then** it must generate a JWT signed with a separate internal secret
- **And** the token MUST have a Time-to-Live (TTL) of exactly 5 minutes
- **And** the payload MUST contain the `userId`, `conversationId`, and the restricted `scopes` for that specific AI agent.

### Story 1.4: Zero-Trust Agent Tool Guardrail
As the Backend Internal API Layer, I want to intercept and validate all requests coming from the AI Engine to any `/internal/tools/*` endpoints, So that the system strictly blocks hallucinating AI from overriding permissions or accessing cross-user data.

**Acceptance Plateau:**
- **Given** the AI Engine makes an HTTP GET request to `/internal/tools/onboarding/me/profile`
- **When** the request hits the NestJS Backend
- **Then** the `InternalAgentGuard` middleware must verify the `internal_scoped_token` signature and expiry
- **And** if the token tries to request data not belonging to the `userId` in the payload, it must immediately throw an HTTP 403 Forbidden exception.

## Epic 2: Core AI Chat Experience
Cung cấp khung giao diện Chat mượt mà, phản hồi theo thời gian thực (streaming), nơi AI hiểu rõ bối cảnh cá nhân của nhân viên và cho phép người dùng tra cứu lịch sử hội thoại.

### Story 2.1: Conversational Chat UI Engine
As an Employee, I want to interact with a chat interface that streams responses in real-time, So that I feel immediate, natural feedback typical of modern AI assistants without waiting for the whole response to load.

**Acceptance Criteria:**
- **Given** the employee is on the chat dashboard
- **When** they type a message and press send
- **Then** their message should appear on the right side of the chat log
- **And** the UI must connect to the Backend via Server-Sent Events (`EventSource` API)
- **And** the UI must incrementally append (render) the AI's response chunks as they arrive, simulating human typing.

### Story 2.2: Suggestive Prompts Configuration
As an Employee, I want to see actionable "Suggestive Prompts" before I start a conversation, So that I don't have to manually type long, repetitive questions.

**Acceptance Criteria:**
- **Given** a new or empty chat session
- **When** the chat UI is rendered
- **Then** the UI should display at least 3 clickable preset prompts (e.g., "Tôi phải làm gì vào ngày đầu?", "Xem quy định của công ty")
- **And** clicking a prompt should inject the text into the input field and submit it immediately.

### Story 2.3: Chat History Local & Remote Sync
As an Employee, I want to start new conversations or load previous ones from a sidebar, So that I can resume past discussions without losing context.

**Acceptance Criteria:**
- **Given** the user has previously interacted with the AI
- **When** they view the conversation history sidebar
- **Then** the Frontend should fetch a list of past `conversationId`s from the REST API
- **And** clicking a past session MUST clear the current screen and fetch/load its historical messages into the Zustand store view.

### Story 2.4: Context Injector Middleware (Context Building)
As the Backend Orchestrator, I want to compile an employee's Profile and recent past session context into a unified block before forwarding the prompt, So that the AI Engine always has explicit, personalized grounding data to reason with.

**Acceptance Criteria:**
- **Given** an incoming chat request from an authenticated user
- **When** the Backend prepares the payload for the OpenClaw Engine
- **Then** it must query the database (Prisma) to fetch the user's Name, Department, and Role
- **And** it must pull up to 10 latest conversation turns from the Redis cache
- **And** it must inject this aggregated summary invisibly into the `system_prompt` payload sent to the Python AI Engine.

## Epic 3: Onboarding Workspace (MVP Target)
Xây dựng không gian hội nhập tự động, giúp nhân viên mới tự giải đáp các thắc mắc (FAQ, Nội quy) và tự gạch bỏ các Nhiệm vụ Onboarding thông qua AI chatbot mà không cần HR can thiệp kéo dài.

### Story 3.1: Support Directory & FAQ Internal API (Cầu nối Kiến thức)
As a Backend Developer, I want to build dedicated Internal APIs that fetch FAQs and support contact directories, So that the AI Engine can query this ground-truth data cleanly using its "Tool Call" capabilities.

**Acceptance Criteria:**
- **Given** the OpenClaw Engine recognizes an intent to lookup an IT contact or policy
- **When** it makes an HTTP GET to `/internal/tools/onboarding/faq` or `/contacts/support` with a valid `internal_scoped_token`
- **Then** the Backend must return structured JSON data from the Postgres database
- **And** the data must be securely filtered so it doesn't expose hidden admin-only notes.

### Story 3.2: Onboarding Tasks Internal API (Cầu nối Nghiệp vụ)
As a New Hire, I want my specific onboarding checklist to be securely accessible via an API, So that the AI Engine can accurately read my progress and mark tasks as complete on my behalf.

**Acceptance Criteria:**
- **Given** an employee has a personalized onboarding plan in the database
- **When** the AI Engine calls `/internal/tools/onboarding/me/checklist`
- **Then** it must retrieve a JSON array of specific pending tasks for that exact `userId` derived from the token
- **And** when the AI calls POST `/complete` for a specific task ID, the Backend must update the task status to 'Done'.

### Story 3.3: Interactive Chat UI for Tool Outcomes (Giao diện Tương tác)
As an Employee, I want to visually see my checklist or contact cards rendered beautifully inside the chat rather than reading a wall of plain text, So that I can easily digest the information and click interactive buttons if needed.

**Acceptance Criteria:**
- **Given** the AI chat streams a response that contains structured payload markers (e.g., `[UI: Checklist_Card]`)
- **When** the Frontend Vite UI parses this message chunk
- **Then** it must render a visual Shadcn UI component inline within the chat bubble instead of raw text
- **And** the user can interact directly with this card (e.g., clicking a Checkbox on the card instantly triggers an update).

## Epic 4: AI Security Auditing

### Story 4.1: Append-Only Audit Tailing Logger
As a Security Administrator, I want the backend to continuously log every AI tool invocation rigidly with a unique `traceId` and `conversationId`, So that I have an immutable (bất biến) record of every action the AI took.

**Acceptance Criteria:**
- **Given** an AI tool requests execution on the Backend
- **When** the `InternalAgentGuard` passes or rejects the execution
- **Then** the Backend must write a structured JSON log entry into the `tool_call_logs` table
- **And** the system/database must strictly prevent DELETE or UPDATE operations on this table to ensure Append-only integrity.

### Story 4.2: Security Investigation Dashboard
As a Security Administrator, I want an interface to look up and filter past audit logs by user, date, or tool name, So that I can trace exactly what the AI was querying during a specific conversation.

**Acceptance Criteria:**
- **Given** the Security Admin is logged into their portal
- **When** they navigate to the "Audit Logs" view
- **Then** the Frontend must display a paginated, filterable table fetched from the Backend
- **And** they must be able to click on a logged `conversationId` to view the exact token scope used for that event.

## Epic 5: Learning & Training (Growth Phase)

### Story 5.1: AI Mini-Quiz Generator & Grading
As an Employee, I want a tool to take mini-quizzes generated by the AI on specific skills, So that I can validate my knowledge without formal exams.

**Acceptance Criteria:**
- **Given** the user requests to test a specific skill
- **When** the AI invokes `/internal/tools/training/quiz/generate`
- **Then** the Frontend renders an interactive Quiz UI Card
- **And** upon submission, the Backend calculates the score, saves it to `quiz_attempts`, and returns the result to the chat.

### Story 5.2: Learning Path Recommender
As an Employee, I want the AI to suggest a sequence of courses based on my current skill gaps, So that I know what to study next for a promotion.

**Acceptance Criteria:**
- **Given** the user asks for learning recommendations
- **When** the AI calls `/internal/tools/training/me/learning-path`
- **Then** the backend serves up their current skills and matrix
- **And** the AI replies with a structured Markdown path, which the UI renders as an interactive Roadmap component.

## Epic 6: Management Analytics (Growth Phase)

### Story 6.1: Sentiment & Progress Reports Workflow
As a Manager, I want to ask the AI for aggregated reports on my department's training progress and pulse (sentiment), So that I can adjust strategy without opening Excel files.

**Acceptance Criteria:**
- **Given** a Manager is in the chat
- **When** they ask "Báo cáo tiến độ đào tạo phòng Dev tháng này"
- **Then** the `training_analytics_agent` gets the data via Internal API
- **And** the UI must render a Summary Card with at least two metrics: % Completion Rate and average sentiment score (Positive/Neutral/Negative).
