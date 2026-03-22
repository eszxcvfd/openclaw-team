# PLAN.md
## Kế hoạch triển khai toàn bộ hệ thống OpenClaw

> Tài liệu này là kế hoạch triển khai chi tiết dành cho coding agent và team developer.
> Đọc `AGENTS.md` trước để hiểu kiến trúc và các RULE bắt buộc trước khi đọc file này.

---

## PHẦN I — TỔNG QUAN HỆ THỐNG

---

### I.1 Mục tiêu sản phẩm

Xây dựng hệ thống AI nội bộ cho doanh nghiệp, hỗ trợ 3 nghiệp vụ chính:

| Nghiệp vụ | Đối tượng | Chức năng |
|-----------|-----------|-----------|
| **Onboarding** | Nhân viên mới | Checklist, FAQ, policy, hướng dẫn ngày đầu |
| **Learning & Training** | Toàn bộ nhân viên | Khóa học, lộ trình học, quiz, gợi ý kỹ năng |
| **Training Analytics** | HR, Manager | Báo cáo đào tạo, phân tích feedback, KPI |

**Triết lý thiết kế:**
- User luôn đi qua Backend — không bao giờ chạm OpenClaw trực tiếp
- Backend là security boundary và control plane duy nhất
- OpenClaw chỉ là AI worker thực thi, không tự quyết quyền
- DB là source of truth cho mọi dữ liệu nghiệp vụ

---

### I.2 Kiến trúc tổng quát

```
┌──────────────────────────────────────────────────────────┐
│                        USER                              │
└─────────────────────────┬────────────────────────────────┘
                          │ Browser / App
┌─────────────────────────▼────────────────────────────────┐
│                     FRONTEND (fe/)                       │
│           Chat UI · Login · Dashboard · Reports          │
└─────────────────────────┬────────────────────────────────┘
                          │ REST API (user_access_token)
┌─────────────────────────▼────────────────────────────────┐
│                     BACKEND (be/)                        │
│  Auth · RBAC · Agent Router · Context Builder            │
│  Business APIs · Internal Tool APIs · Audit/Logging      │
└──────┬──────────────────────────────────────┬────────────┘
       │ gọi OpenClaw                         │ internal tool API calls
       │ (internal_scoped_token)              │ từ OpenClaw trả về
┌──────▼──────────────────────────────────────┴────────────┐
│                    OPENCLAW (openclaw/)                   │
│     onboarding_assistant                                 │
│     learning_training_agent                              │
│     training_analytics_agent                             │
└─────────────────────────┬────────────────────────────────┘
                          │ Tool calls → Backend Internal APIs
┌─────────────────────────▼────────────────────────────────┐
│                     DATA LAYER                           │
│        PostgreSQL · data/ (tĩnh) · generated/ (context)  │
└──────────────────────────────────────────────────────────┘
```

---

### I.3 Thành phần hệ thống

| Thành phần | Thư mục | Công nghệ | Vai trò |
|------------|---------|-----------|---------|
| Frontend | `fe/` | React + Vite (JSX) | Chat UI, gọi BE API |
| Backend | `be/` | NestJS + Prisma + PostgreSQL | Control plane, auth, routing, internal APIs |
| AI Engine | `openclaw/` | OpenClaw runtime | AI agent, tool calling |
| Static Data | `data/` | Markdown files | Tài liệu tĩnh (handbook, FAQ...) |
| Context Files | `generated/` | Markdown + JSON | Context sinh ra theo user/session |

---

### I.4 Ba agent lớn

```
onboarding_assistant
├── Employee Guide         → Hướng dẫn ngày đầu, policy
├── Onboarding Checklist   → Theo dõi task onboarding
└── New Hire FAQ           → Trả lời câu hỏi thường gặp

learning_training_agent
├── Training Recommendation → Gợi ý khóa học theo skill gap
├── Learning Path           → Sinh lộ trình học cá nhân hóa
└── Quiz Generator          → Tạo quiz, chấm điểm, lưu kết quả

training_analytics_agent
├── Feedback Analysis       → Phân tích sentiment feedback
├── Progress Tracking       → Tiến độ đào tạo user / phòng ban
└── Training Report         → Sinh báo cáo đào tạo
```

---

### I.5 Luồng hoạt động tổng quát

```
[1] User gõ câu hỏi trên FE
[2] FE gửi POST /chat/message kèm user_access_token
[3] BE AuthGuard → verify token → xác định userId, role, agent access
[4] BE AgentRouter → phân loại intent → chọn agent group
[5] BE ContextBuilder → build user context + session context
[6] BE InternalTokenService → tạo internal_scoped_token (JWT ngắn hạn)
[7] BE OpenClawClient → gọi OpenClaw kèm context + token
[8] OpenClaw agent → reasoning → gọi tool nếu cần dữ liệu
[9] Tool → gọi BE Internal API (/internal/tools/...) kèm token
[10] BE InternalGuard → verify token + scope + agent + user
[11] BE Service → query DB → trả JSON về tool
[12] Agent → nhận dữ liệu → tổng hợp → sinh câu trả lời
[13] OpenClaw → trả final answer về BE
[14] BE → lưu messages + tool_call_logs + audit_log
[15] BE → trả response về FE
[16] FE → hiển thị câu trả lời cho user
```

---

### I.6 Tokenization và bảo mật

```
FE → BE:         Authorization: Bearer <user_access_token>
                 (JWT user chuẩn, signed bằng JWT_ACCESS_SECRET)

BE → OpenClaw:   internal_scoped_token (payload):
                 {
                   agent: "onboarding_assistant",
                   userId: "uuid",
                   conversationId: "uuid",
                   scope: ["read:onboarding"],
                   iat, exp (TTL: 1h),
                   jti: "unique-id"
                 }

Tool → BE:       Authorization: Bearer <internal_scoped_token>
                 X-Agent-Name: onboarding_assistant
                 X-User-Id: <uuid>
                 X-Conversation-Id: <uuid>
                 X-Trace-Id: <trace-id>
```

---

### I.7 Hạ tầng triển khai

**Giai đoạn đầu (tối thiểu):**

```
Server A: Frontend (nginx) + Backend (NestJS)
Server B: OpenClaw runtime
Server C: PostgreSQL + Redis
```

**Mở rộng (khi cần scale):**

```
Server A: Frontend (nginx + CDN)
Server B: Backend API (NestJS, nhiều instance)
Server C: OpenClaw runtime (có thể nhiều instance)
Server D: PostgreSQL (primary + replica)
Server E: Redis (cache + queue)
Server F: Worker jobs (BullMQ workers)
```

---

### I.8 Cấu trúc thư mục toàn project

```text
project-root/
├── AGENTS.md                        ← Kiến trúc, rules cho toàn hệ thống
├── PLAN.md                          ← File này — kế hoạch triển khai
├── system-workflow-architecture.md  ← Workflow tham khảo chi tiết
│
├── fe/                              ← Frontend
│   ├── AGENTS.md
│   ├── src/
│   │   ├── main.jsx
│   │   ├── App.jsx
│   │   ├── App.css
│   │   └── index.css
│   ├── public/
│   ├── vite.config.js
│   ├── eslint.config.js
│   └── package.json
│
├── be/                              ← Backend
│   ├── AGENTS.md
│   ├── src/
│   │   ├── main.ts
│   │   ├── app.module.ts
│   │   ├── config/
│   │   ├── common/
│   │   ├── modules/
│   │   │   ├── auth/
│   │   │   ├── iam/
│   │   │   ├── chat/
│   │   │   ├── agent-router/
│   │   │   ├── context-builder/
│   │   │   ├── tool-gateway/
│   │   │   ├── openclaw/
│   │   │   ├── onboarding/
│   │   │   ├── training/
│   │   │   ├── analytics/
│   │   │   ├── documents/
│   │   │   ├── audit/
│   │   │   ├── jobs/
│   │   │   └── health/
│   │   └── infra/
│   ├── prisma/
│   ├── docs/
│   │   ├── architecture/
│   │   ├── api/
│   │   ├── db/
│   │   └── plan/
│   ├── data/
│   ├── generated/
│   └── docker-compose.yml
│
├── openclaw/                        ← OpenClaw AI Engine
│
├── data/                            ← Tài liệu tĩnh
│   ├── common/
│   ├── onboarding/
│   ├── training/
│   └── analytics/
│
└── generated/                       ← File context sinh ra
    ├── context/
    ├── onboarding/
    ├── training/
    └── analytics/
```

---

### I.9 Kế hoạch triển khai theo phase (Tổng quan)

| Phase | Tên | Nội dung chính | Thành phần |
|-------|-----|----------------|------------|
| **Phase 0** | Foundation | Khung dự án, infra, CI/CD | BE + FE skeleton |
| **Phase 1** | Auth & Core | Auth, RBAC, chat UI cơ bản | BE (auth, iam, chat) + FE (login, chat) |
| **Phase 2** | Onboarding | Module onboarding end-to-end | BE + OpenClaw + FE |
| **Phase 3** | Training | Module training end-to-end | BE + OpenClaw + FE |
| **Phase 4** | Analytics | Module analytics end-to-end | BE + OpenClaw + FE |
| **Phase 5** | Hardening | Audit, observability, rate limit | BE |
| **Phase 6** | Polish | UX hoàn chỉnh, deploy production | FE + BE + Infra |

---

## PHẦN II — KẾ HOẠCH CHI TIẾT BACKEND (`be/`)

---

### II.1 Kiến trúc nội bộ Backend

```
HTTP Request
     ↓
Controller Layer          → Nhận request, validate DTO, trả response
     ↓
Guard / Policy Layer      → AuthGuard, RolesGuard, AgentAccessGuard
     ↓
Service Layer             → Business logic
     ↓
Orchestrator Layer        → AgentRouter, ContextBuilder, OpenClawClient
     ↓
Repository / Prisma       → Truy vấn DB
     ↓
Integration Layer         → OpenClaw client, Redis, BullMQ, filesystem
```

---

### II.2 Công nghệ Backend

```
Framework:   NestJS (TypeScript)
ORM:         Prisma
Database:    PostgreSQL 16
Cache:       Redis 7
Queue:       BullMQ
Auth:        JWT (access + refresh + internal scoped token)
Validation:  class-validator + class-transformer
API Style:   REST
Container:   Docker + docker-compose
```

---

### II.3 Module chi tiết

#### Module: `auth`

**Trách nhiệm:**
- Đăng nhập bằng email/password
- Phát access_token (TTL: 15 phút) và refresh_token (TTL: 7 ngày)
- Refresh token luân chuyển
- Logout (revoke refresh token)
- Guard xác thực cho toàn bộ external API

**Files chính:**
```
src/modules/auth/
  auth.controller.ts       → POST /auth/login, /auth/refresh, /auth/logout, GET /auth/me
  auth.service.ts          → login(), refresh(), logout(), validateUser()
  auth.module.ts
  guards/
    jwt-auth.guard.ts      → verify access_token
  strategies/
    jwt.strategy.ts        → Passport JWT strategy
  dto/
    login.dto.ts
    refresh.dto.ts
```

**DB tables:** `users`, `auth_sessions`, `user_roles`, `roles`

**API endpoints:**
```
POST /auth/login          → Đăng nhập, trả access_token + refresh_token
POST /auth/refresh        → Đổi refresh_token lấy access_token mới
POST /auth/logout         → Revoke refresh_token
GET  /auth/me             → Thông tin user hiện tại
```

---

#### Module: `iam` (Identity & Access Management)

**Trách nhiệm:**
- Quản lý users, roles, permissions
- Phân quyền theo RBAC
- Kiểm tra user có được dùng agent nào
- Access evaluator trung tâm

**Files chính:**
```
src/modules/iam/
  users/
    users.service.ts
    users.repository.ts
  roles/
    roles.service.ts
  permissions/
    permissions.service.ts
    access-evaluator.service.ts   → hasPermission(), canAccessAgent()
  user-agent-access/
    user-agent-access.service.ts
  iam.module.ts
```

**DB tables:** `users`, `departments`, `positions`, `roles`, `permissions`, `role_permissions`, `user_roles`, `user_agent_access`

---

#### Module: `chat`

**Trách nhiệm:**
- Entry point chính cho user chat (POST /chat/message)
- Tạo/get conversation
- Lưu user message và assistant message
- Điều phối toàn bộ luồng: agent routing → context building → OpenClaw → lưu kết quả

**Files chính:**
```
src/modules/chat/
  chat.controller.ts          → POST /chat/message
  chat.service.ts             → orchestrate toàn bộ luồng chat
  conversation.service.ts     → create/get conversation
  message.service.ts          → saveMessage(), listMessages()
  dto/
    send-message.dto.ts
  chat.module.ts
```

**API endpoints:**
```
POST /chat/message                    → Gửi message, nhận AI response
GET  /conversations                   → Danh sách conversation
GET  /conversations/:id/messages      → Lịch sử messages
```

**DB tables:** `conversations`, `messages`

**Luồng trong chat.service.ts:**
```
1. verifyUser()
2. getOrCreateConversation()
3. agentRouter.route(message, user)
4. contextBuilder.build(user, conversation, agentGroup)
5. internalTokenService.create(agent, user, conversation, scope)
6. openclawClient.send(agentName, message, context, token)
7. saveUserMessage()
8. saveAssistantMessage()
9. saveToolCallLogs()
10. auditService.log()
11. return response
```

---

#### Module: `agent-router`

**Trách nhiệm:**
- Phân loại intent sơ bộ của message
- Chọn agent group phù hợp
- Kiểm tra user có quyền dùng agent đó không
- Logic routing dựa trên keyword + user role

**Files chính:**
```
src/modules/agent-router/
  agent-router.service.ts      → route(message, user): AgentGroup
  classifiers/
    keyword-classifier.ts      → match keyword → agent group
    role-classifier.ts         → nếu là HR/Manager → analytics agent
  policies/
    agent-access.policy.ts     → kiểm tra user_agent_access
  agent-router.module.ts
```

**Logic routing:**
```
IF message chứa keyword onboarding/task/checklist/FAQ/ngày đầu
  → onboarding_assistant
ELIF message chứa keyword học/khóa/quiz/skill/lộ trình
  → learning_training_agent
ELIF message chứa keyword báo cáo/report/KPI/feedback/phòng ban
  + user có quyền analytics
  → training_analytics_agent
ELSE
  → fallback: onboarding_assistant (default)
```

---

#### Module: `context-builder`

**Trách nhiệm:**
- Build user context để gửi sang OpenClaw
- Lấy profile, role, quyền, trạng thái onboarding/training
- Lọc allowed documents + allowed resources theo quyền
- Tùy chọn sinh file USER.md + session-context.md

**Files chính:**
```
src/modules/context-builder/
  context-builder.service.ts    → build(): UserContext
  user-context.service.ts       → getUserSummary()
  session-context.service.ts    → getSessionContext()
  document-context.service.ts   → getAllowedDocuments()
  context-builder.module.ts
```

**Cấu trúc context gửi sang OpenClaw:**
```json
{
  "user": {
    "id": "uuid",
    "fullName": "Nguyễn Văn A",
    "email": "...",
    "department": "Engineering",
    "position": "Intern",
    "roles": ["employee"],
    "joinDate": "2026-03-15",
    "onboardingStatus": { "completedTasks": 2, "totalTasks": 5 }
  },
  "session": {
    "conversationId": "uuid",
    "agentGroup": "onboarding_assistant",
    "startedAt": "...",
    "messageCount": 3
  },
  "allowedResources": {
    "documents": ["doc-id-1", "doc-id-2"],
    "tools": ["get_my_checklist", "get_my_profile"],
    "scopes": ["read:onboarding", "read:checklist"]
  }
}
```

---

#### Module: `tool-gateway`

**Trách nhiệm:**
- Đăng ký và quản lý danh sách tool
- Map tool name → Backend service method
- Kiểm tra agent có được dùng tool đó không (từ `agent_group_tools`)
- Verify internal token khi OpenClaw gọi vào internal endpoints
- Log tất cả tool calls

**Files chính:**
```
src/modules/tool-gateway/
  tool-gateway.service.ts          → registerTool(), executeToolCall()
  registry/
    tool.registry.ts               → Map<toolName, ToolDefinition>
  guards/
    internal-token.guard.ts        → verify internal_scoped_token
    agent-scope.guard.ts           → kiểm tra scope hợp lệ
  tools/
    onboarding/
      get-my-profile.tool.ts
      get-my-onboarding.tool.ts
      get-my-checklist.tool.ts
      get-onboarding-faq.tool.ts
      get-support-contacts.tool.ts
      complete-checklist-task.tool.ts
    training/
      get-my-skills.tool.ts
      get-my-courses.tool.ts
      get-my-learning-path.tool.ts
      get-training-recommendations.tool.ts
      generate-learning-path.tool.ts
      generate-quiz.tool.ts
      submit-quiz.tool.ts
      get-quiz-result.tool.ts
    analytics/
      get-training-overview.tool.ts
      get-training-progress.tool.ts
      get-department-analytics.tool.ts
      get-training-feedback.tool.ts
      analyze-training-feedback.tool.ts
      generate-training-report.tool.ts
      list-training-reports.tool.ts
      get-training-report-detail.tool.ts
  tool-gateway.module.ts
```

**Internal API endpoints (tất cả đều yêu cầu InternalTokenGuard):**
```
GET  /internal/tools/onboarding/me/profile
GET  /internal/tools/onboarding/me/onboarding
GET  /internal/tools/onboarding/me/checklist
POST /internal/tools/onboarding/me/checklist/:taskId/complete
GET  /internal/tools/onboarding/faq
GET  /internal/tools/onboarding/contacts/support

GET  /internal/tools/training/me/skills
GET  /internal/tools/training/me/courses
GET  /internal/tools/training/me/learning-path
POST /internal/tools/training/me/learning-path/generate
GET  /internal/tools/training/me/training-recommendations
POST /internal/tools/training/quiz/generate
POST /internal/tools/training/quiz/submit
GET  /internal/tools/training/quiz/:id/result

GET  /internal/tools/analytics/training/overview
GET  /internal/tools/analytics/training/progress
GET  /internal/tools/analytics/training/department
GET  /internal/tools/analytics/training/feedback
POST /internal/tools/analytics/training/feedback/analyze
POST /internal/tools/analytics/training/reports/generate
GET  /internal/tools/analytics/training/reports
GET  /internal/tools/analytics/training/reports/:id
```

---

#### Module: `openclaw` (OpenClaw Client)

**Trách nhiệm:**
- HTTP client gọi sang OpenClaw runtime
- Đóng gói request đúng format
- Xử lý timeout + retry (max 2 retries)
- Parse response từ OpenClaw

**Files chính:**
```
src/modules/openclaw/
  openclaw.client.ts        → send(request: OpenClawRequest): OpenClawResponse
  openclaw.service.ts       → wrapper với error handling
  dto/
    openclaw-request.dto.ts
    openclaw-response.dto.ts
  openclaw.module.ts
```

**Request format sang OpenClaw:**
```json
{
  "agentName": "onboarding_assistant",
  "message": "Tôi còn task onboarding nào chưa làm?",
  "context": { "user": {}, "session": {}, "allowedResources": {} },
  "internalToken": "<internal_scoped_token>",
  "conversationId": "uuid",
  "traceId": "trace-abc-001"
}
```

---

#### Module: `onboarding` (Business)

**Trách nhiệm:**
- Business logic onboarding
- Phục vụ cả external API (FE gọi) và internal tool API (OpenClaw gọi)

**Files chính:**
```
src/modules/onboarding/
  onboarding.controller.ts       → External API routes
  onboarding.service.ts          → Tổng hợp business logic
  checklist.service.ts           → getChecklist(), completeTask()
  faq.service.ts                 → getFaq()
  contacts.service.ts            → getSupportContacts()
  policy.service.ts              → getCompanyPolicies()
  onboarding.module.ts
  dto/
```

**DB tables:** `onboarding_plans`, `onboarding_tasks`, `user_onboarding_tasks`, `faq_items`, `contacts_directory`, `company_policies`

**External API:**
```
GET  /me/onboarding                        → Tổng quan onboarding
GET  /me/checklist                         → Danh sách tasks + status
POST /me/checklist/:taskId/complete        → Đánh dấu hoàn thành
GET  /api/faq?category=onboarding          → FAQ
GET  /api/contacts/support                 → Danh bạ hỗ trợ
```

---

#### Module: `training` (Business)

**Trách nhiệm:**
- Skills, courses, learning path, quiz, recommendations
- Phục vụ cả external API và internal tool API

**Files chính:**
```
src/modules/training/
  training.controller.ts
  training.service.ts
  skill.service.ts               → getUserSkills(), getSkillGap()
  course.service.ts              → getCourses(), getCourseDetail()
  learning-path.service.ts       → getLearningPath(), generateLearningPath()
  recommendation.service.ts      → getRecommendations()
  quiz.service.ts                → generateQuiz(), submitQuiz(), getResult()
  training.module.ts
  dto/
```

**DB tables:** `skills`, `user_skills`, `role_skill_requirements`, `courses`, `course_skills`, `course_prerequisites`, `user_courses`, `learning_paths`, `learning_path_items`, `user_learning_paths`, `quiz_templates`, `quiz_questions`, `quiz_attempts`

**External API:**
```
GET  /me/skills                        → Kỹ năng hiện tại
GET  /me/courses                       → Khóa học của user
GET  /me/learning-path                 → Lộ trình học
GET  /me/training-recommendations      → Gợi ý khóa học
GET  /api/courses                      → Danh mục khóa học
GET  /api/courses/:id                  → Chi tiết khóa học
```

---

#### Module: `analytics` (Business)

**Trách nhiệm:**
- Báo cáo, feedback, progress, KPI snapshots
- Chủ yếu phục vụ training_analytics_agent (HR/Manager)
- Có điều kiện phân quyền chặt hơn

**Files chính:**
```
src/modules/analytics/
  analytics.controller.ts
  analytics.service.ts
  feedback.service.ts           → getFeedback(), analyzeFeedback()
  reports.service.ts            → generateReport(), listReports()
  progress.service.ts           → getProgressByUser(), getProgressByDept()
  snapshot.service.ts           → getKpiSnapshot()
  analytics.module.ts
  dto/
```

**DB tables:** `training_sessions`, `training_attendance`, `training_feedback`, `reports`, `analytics_snapshots`

**External API (chỉ HR/Manager):**
```
GET  /api/training/analytics/overview          → Tổng quan KPI
GET  /api/training/reports                     → Danh sách báo cáo
POST /api/training/reports/generate            → Sinh báo cáo mới
GET  /api/training/reports/:id                 → Chi tiết báo cáo
```

---

#### Module: `audit`

**Trách nhiệm:**
- Ghi audit trail cho mọi thao tác quan trọng
- Log permission denied, tool calls, agent routing, report generation

**DB tables:** `tool_call_logs` + bảng audit riêng nếu cần

---

#### Module: `jobs`

**Trách nhiệm:**
- Background job: generate report PDF (async)
- Batch analyze feedback
- Nightly analytics snapshot
- Cleanup generated files cũ

**Tech:** BullMQ + Redis

---

### II.4 Services quan trọng

| Service | Trách nhiệm |
|---------|-------------|
| `AuthService` | login, logout, refresh, validate JWT |
| `InternalTokenService` | tạo + verify internal_scoped_token |
| `AgentRouterService` | phân loại intent, chọn agent group |
| `ContextBuilderService` | build user context gửi sang OpenClaw |
| `OpenClawClient` | HTTP client gọi OpenClaw |
| `PermissionService` | hasPermission(), canAccessAgent() |
| `AuditService` | log mọi thao tác quan trọng |
| `ToolAuthService` | verify internal token khi tool gọi vào BE |

---

### II.5 Database Schema tóm tắt

**Schema:** `app` (tất cả bảng nằm đây)

```
Core:         users, departments, positions, roles, permissions,
              role_permissions, user_roles, auth_sessions

Agent Access: agent_groups, agent_submodules, user_agent_access,
              backend_api_catalog, tools, agent_group_tools,
              service_tokens, tool_call_logs

Documents:    documents, document_permissions,
              user_contexts, session_contexts, generated_artifacts

Chat:         conversations, messages

Onboarding:   onboarding_plans, onboarding_tasks, user_onboarding_tasks,
              faq_items, contacts_directory, company_policies

Training:     skills, user_skills, role_skill_requirements,
              courses, course_skills, course_prerequisites, user_courses,
              learning_paths, learning_path_items, user_learning_paths,
              quiz_templates, quiz_questions, quiz_attempts

Analytics:    training_sessions, training_attendance,
              training_feedback, reports, analytics_snapshots
```

---

### II.6 Biến môi trường Backend

```env
NODE_ENV=development
PORT=3000

DATABASE_URL=postgresql://postgres:postgres@localhost:5432/openclaw_db
REDIS_URL=redis://localhost:6379

# User JWT
JWT_ACCESS_SECRET=<secret>
JWT_ACCESS_TTL=900          # 15 phút

JWT_REFRESH_SECRET=<secret>
JWT_REFRESH_TTL=604800      # 7 ngày

# Internal Agent JWT (secret riêng, KHÔNG dùng chung với user)
JWT_INTERNAL_SECRET=<secret>
JWT_INTERNAL_TTL=3600       # 1 giờ

# OpenClaw
OPENCLAW_BASE_URL=http://openclaw:8080
OPENCLAW_API_KEY=<key>
OPENCLAW_TIMEOUT=30000      # 30 giây
OPENCLAW_MAX_RETRIES=2

# File paths
DATA_DIR=./data
GENERATED_DIR=./generated

LOG_LEVEL=debug
```

---

### II.7 Milestone Backend

#### Milestone BE-1: Project Bootstrap
- [ ] Khởi tạo NestJS project
- [ ] Setup Prisma + PostgreSQL
- [ ] Setup Redis
- [ ] Config module (env validation với Joi)
- [ ] Logger (Winston hoặc Pino)
- [ ] Global exception filter
- [ ] Request ID / TraceID interceptor
- [ ] Health check endpoint (`GET /health`)
- [ ] Docker + docker-compose

#### Milestone BE-2: Auth & IAM
- [ ] Schema migration: users, roles, permissions, user_roles, auth_sessions
- [ ] Seed: roles (admin, hr, manager, employee)
- [ ] POST /auth/login (email + password → JWT)
- [ ] POST /auth/refresh
- [ ] POST /auth/logout
- [ ] GET /auth/me
- [ ] JwtAuthGuard (global)
- [ ] RolesGuard + @Roles() decorator
- [ ] PermissionService.hasPermission()
- [ ] AgentAccessService.canAccess()
- [ ] UserService.getProfile()

#### Milestone BE-3: Chat Entry Point & Agent Router
- [ ] Schema migration: conversations, messages, agent_groups, user_agent_access
- [ ] Seed: 3 agent_groups (onboarding, learning_training, training_analytics)
- [ ] POST /chat/message (skeleton — chưa gọi OpenClaw thật)
- [ ] ConversationService.getOrCreate()
- [ ] MessageService.save()
- [ ] AgentRouterService.route() (keyword-based + role-based)
- [ ] GET /conversations
- [ ] GET /conversations/:id/messages

#### Milestone BE-4: Internal Auth & Token
- [ ] InternalTokenService.create() — tạo internal_scoped_token
- [ ] InternalTokenService.verify() — verify token
- [ ] InternalTokenGuard — guard cho /internal/tools/*
- [ ] AgentScopeGuard — kiểm tra scope
- [ ] Setup prefix routing /internal/tools/*
- [ ] Unit test cho token create + verify

#### Milestone BE-5: Context Builder
- [ ] ContextBuilderService.build() — build user context
- [ ] UserContextService.getUserSummary()
- [ ] SessionContextService.getSessionContext()
- [ ] DocumentContextService.getAllowedDocuments()
- [ ] Tùy chọn: sinh file generated/context/users/{id}/USER.md

#### Milestone BE-6: OpenClaw Client
- [ ] OpenClawClient.send() — gọi HTTP sang OpenClaw
- [ ] Timeout handling (30s)
- [ ] Retry logic (max 2 retries với exponential backoff)
- [ ] Parse response từ OpenClaw
- [ ] Error code OPENCLAW_TIMEOUT

#### Milestone BE-7: Onboarding Domain
- [ ] Schema migration: onboarding_plans, onboarding_tasks, user_onboarding_tasks, faq_items, contacts_directory, company_policies
- [ ] Seed: onboarding plan mẫu cho Engineering Intern
- [ ] OnboardingService, ChecklistService, FaqService, ContactsService
- [ ] External API: GET /me/onboarding, GET /me/checklist, POST /me/checklist/:taskId/complete
- [ ] External API: GET /api/faq, GET /api/contacts/support
- [ ] Internal Tool API: /internal/tools/onboarding/*
- [ ] Tool Gateway: đăng ký 6 tool onboarding
- [ ] Test end-to-end: chat → onboarding_assistant → get_my_checklist

#### Milestone BE-8: Training Domain
- [ ] Schema migration: skills, user_skills, role_skill_requirements, courses, course_skills, course_prerequisites, user_courses, learning_paths, learning_path_items, user_learning_paths, quiz_templates, quiz_questions, quiz_attempts
- [ ] Seed: skills mẫu, courses mẫu
- [ ] SkillService, CourseService, LearningPathService, QuizService, RecommendationService
- [ ] External API: /me/skills, /me/courses, /me/learning-path, /me/training-recommendations
- [ ] Internal Tool API: /internal/tools/training/*
- [ ] Tool Gateway: đăng ký 8 tool training

#### Milestone BE-9: Analytics Domain
- [ ] Schema migration: training_sessions, training_attendance, training_feedback, reports, analytics_snapshots
- [ ] ProgressService, FeedbackService, ReportsService, SnapshotService
- [ ] External API: /api/training/analytics/overview, /api/training/reports
- [ ] Internal Tool API: /internal/tools/analytics/*
- [ ] Tool Gateway: đăng ký 8 tool analytics
- [ ] Background job: generate report async

#### Milestone BE-10: Audit & Hardening
- [ ] AuditService.log() — ghi audit trail
- [ ] tool_call_logs: log mọi tool invocation
- [ ] Rate limiting (throttler)
- [ ] Idempotency cho generate report + submit quiz
- [ ] Request timeout toàn cục
- [ ] Structured logging đầy đủ (traceId, userId, agentGroup)

---

## PHẦN III — KẾ HOẠCH CHI TIẾT FRONTEND (`fe/`)

---

### III.1 Công nghệ Frontend

```
Framework:   React (JSX, không TypeScript hiện tại)
Build tool:  Vite
Styling:     CSS modules hoặc CSS thuần
HTTP client: fetch / axios
State:       React hooks (useState, useContext)
```

---

### III.2 Cấu trúc thư mục Frontend

```text
fe/src/
├── main.jsx                   ← App entry point
├── App.jsx                    ← Router + layout chính
├── App.css
├── index.css                  ← Global styles
│
├── pages/
│   ├── LoginPage.jsx          ← Trang đăng nhập
│   ├── ChatPage.jsx           ← Trang chat chính
│   ├── ConversationsPage.jsx  ← Danh sách hội thoại
│   └── ProfilePage.jsx        ← Thông tin user (tùy chọn)
│
├── components/
│   ├── auth/
│   │   └── LoginForm.jsx
│   ├── chat/
│   │   ├── ChatWindow.jsx     ← Toàn bộ khu vực chat
│   │   ├── MessageList.jsx    ← Danh sách messages
│   │   ├── MessageBubble.jsx  ← Một message (user / assistant)
│   │   ├── MessageInput.jsx   ← Ô nhập tin nhắn
│   │   └── TypingIndicator.jsx
│   ├── sidebar/
│   │   ├── Sidebar.jsx
│   │   └── ConversationItem.jsx
│   └── common/
│       ├── Button.jsx
│       ├── LoadingSpinner.jsx
│       └── ErrorBanner.jsx
│
├── services/
│   ├── api.js                 ← Base HTTP client (axios instance)
│   ├── auth.service.js        → login(), logout(), getMe(), refreshToken()
│   ├── chat.service.js        → sendMessage(), getConversations(), getMessages()
│   └── token.service.js       → lưu/lấy/xóa token từ localStorage
│
├── context/
│   ├── AuthContext.jsx        ← user state + login/logout
│   └── ChatContext.jsx        ← conversation + messages state
│
└── hooks/
    ├── useAuth.js
    └── useChat.js
```

---

### III.3 Luồng Frontend

**Login flow:**
```
1. User mở app → kiểm tra localStorage có token chưa
2. Nếu không có → redirect LoginPage
3. User nhập email + password → POST /auth/login
4. Nhận access_token + refresh_token → lưu localStorage
5. Redirect → ChatPage
```

**Chat flow:**
```
1. User nhập message → click Send
2. Hiện typing indicator
3. POST /chat/message với Authorization header
4. Nhận response → render MessageBubble
5. Nếu 401 → auto refresh token → retry request
6. Nếu refresh thất bại → logout → redirect Login
```

**Token refresh:**
```
- axios interceptor: nếu nhận 401 → tự gọi POST /auth/refresh
- Nếu refresh thành công → retry request gốc
- Nếu refresh thất bại → xóa token → redirect Login
```

---

### III.4 Rules Frontend bắt buộc

- ❌ Không gọi OpenClaw trực tiếp từ FE
- ❌ Không lưu permission/role logic trong FE code
- ❌ Không gọi `/internal/tools/*` từ FE
- ✅ Mọi API call đều qua `api.js` (axios instance với base URL và auth header)
- ✅ `user_access_token` lưu trong `localStorage` (hoặc memory nếu bảo mật hơn)
- ✅ Auto refresh token khi nhận 401

---

### III.5 API calls Frontend sử dụng

```
POST /auth/login
POST /auth/refresh
POST /auth/logout
GET  /auth/me

POST /chat/message
GET  /conversations
GET  /conversations/:id/messages
```

---

### III.6 Milestone Frontend

#### Milestone FE-1: Setup & Login
- [ ] Vite project đã setup (đã có)
- [ ] Global CSS, fonts, color scheme
- [ ] LoginPage + LoginForm component
- [ ] auth.service.js: login(), logout()
- [ ] token.service.js: lưu/lấy localStorage
- [ ] AuthContext: user state
- [ ] Route guard: redirect nếu chưa login

#### Milestone FE-2: Chat UI cơ bản
- [ ] ChatPage layout (sidebar + chat window)
- [ ] MessageList + MessageBubble (user/assistant phân biệt màu)
- [ ] MessageInput + Send button
- [ ] chat.service.js: sendMessage()
- [ ] Loading state + TypingIndicator
- [ ] Hiển thị agentGroup tag trong conversation

#### Milestone FE-3: Conversation Management
- [ ] Sidebar: danh sách conversations
- [ ] ConversationItem: tên, thời gian, agent group
- [ ] GET /conversations + GET /conversations/:id/messages
- [ ] Tạo conversation mới (optional conversationId)
- [ ] Switch giữa conversations

#### Milestone FE-4: Auto Token Refresh
- [ ] axios interceptor: catch 401 → gọi /auth/refresh
- [ ] Retry request gốc sau khi refresh thành công
- [ ] Logout + redirect nếu refresh thất bại

#### Milestone FE-5: Polish
- [ ] Error handling đầy đủ (network error, 5xx)
- [ ] Empty state (chưa có conversation)
- [ ] Responsive layout
- [ ] Loading skeleton cho message list

---

## PHẦN IV — KẾ HOẠCH CHI TIẾT OPENCLAW (`openclaw/`)

---

### IV.1 Vai trò của OpenClaw trong hệ thống

OpenClaw là **AI Agent Engine** — không phải entry point, không phải security layer.

```
Backend  →  [POST /run]  →  OpenClaw
OpenClaw →  [GET /internal/tools/*]  →  Backend (với internal_scoped_token)
OpenClaw →  [final answer]  →  Backend
```

OpenClaw chỉ biết:
- Tên agent cần chạy (`agentName`)
- Message của user
- Context backend cung cấp (user profile + session + allowed resources)
- Internal token để gọi tool

OpenClaw **không biết** và **không được phép**:
- Tự phán quyền user có quyền xem gì không
- Query DB của hệ thống
- Gọi API ngoài `/internal/tools/*`

---

### IV.2 Cấu trúc Agent trong OpenClaw

```
agents/
├── onboarding_assistant/
│   ├── system_prompt.md          ← System prompt + vai trò + tone
│   ├── tool_allowlist.json       ← Danh sách tool được cấp
│   └── agent.ts                 ← Agent config
│
├── learning_training_agent/
│   ├── system_prompt.md
│   ├── tool_allowlist.json
│   └── agent.ts
│
└── training_analytics_agent/
    ├── system_prompt.md
    ├── tool_allowlist.json
    └── agent.ts
```

---

### IV.3 System Prompt gợi ý cho từng Agent

**onboarding_assistant:**
```
Bạn là trợ lý onboarding nội bộ. Nhiệm vụ của bạn là:
- Giúp nhân viên mới hiểu quy trình ngày đầu đi làm
- Trả lời câu hỏi về policy, checklist, người liên hệ hỗ trợ
- Hướng dẫn từng bước cụ thể, thân thiện và rõ ràng

Bạn chỉ được sử dụng các tool sau: [get_my_profile, get_my_onboarding,
get_my_checklist, get_onboarding_faq, get_support_contacts, complete_checklist_task]

Không tự suy ra thông tin không có trong context hoặc kết quả tool.
```

**learning_training_agent:**
```
Bạn là trợ lý học tập và đào tạo. Nhiệm vụ của bạn là:
- Phân tích kỹ năng hiện tại và gap so với yêu cầu vị trí
- Gợi ý khóa học phù hợp theo lộ trình học cá nhân hóa
- Tạo quiz để kiểm tra kiến thức và đưa ra nhận xét kết quả

Bạn chỉ được sử dụng các tool sau: [get_my_skills, get_my_courses,
get_my_learning_path, get_training_recommendations, generate_learning_path,
generate_quiz, submit_quiz, get_quiz_result]
```

**training_analytics_agent:**
```
Bạn là trợ lý phân tích đào tạo dành cho HR và Manager. Nhiệm vụ của bạn là:
- Cung cấp báo cáo tiến độ đào tạo theo người dùng hoặc phòng ban
- Phân tích feedback đào tạo (sentiment, topics, trends)
- Sinh báo cáo định kỳ theo yêu cầu

Bạn chỉ được sử dụng các tool sau: [get_training_overview, get_training_progress,
get_department_training_analytics, get_training_feedback, analyze_training_feedback,
generate_training_report, list_training_reports, get_training_report_detail]

Lưu ý: Chỉ cung cấp thông tin tổng hợp, không để lộ thông tin cá nhân vi phạm quyền riêng tư.
```

---

### IV.4 Tool Allowlist theo Agent

**onboarding_assistant:**
```json
{
  "allowedTools": [
    "get_my_profile",
    "get_my_onboarding",
    "get_my_checklist",
    "get_onboarding_faq",
    "get_support_contacts",
    "complete_checklist_task"
  ]
}
```

**learning_training_agent:**
```json
{
  "allowedTools": [
    "get_my_skills",
    "get_my_courses",
    "get_my_learning_path",
    "get_training_recommendations",
    "generate_learning_path",
    "generate_quiz",
    "submit_quiz",
    "get_quiz_result"
  ]
}
```

**training_analytics_agent:**
```json
{
  "allowedTools": [
    "get_training_overview",
    "get_training_progress",
    "get_department_training_analytics",
    "get_training_feedback",
    "analyze_training_feedback",
    "generate_training_report",
    "list_training_reports",
    "get_training_report_detail"
  ]
}
```

---

### IV.5 Cách Tool gọi Backend

Mỗi tool call từ OpenClaw sang BE phải có đầy đủ headers:

```http
GET /internal/tools/onboarding/me/checklist HTTP/1.1
Host: backend:3000
Authorization: Bearer <internal_scoped_token>
X-Agent-Name: onboarding_assistant
X-User-Id: <userId>
X-Conversation-Id: <conversationId>
X-Trace-Id: <traceId>
Content-Type: application/json
```

---

### IV.6 Milestone OpenClaw

#### Milestone OC-1: Kết nối với Backend
- [ ] Nhận request từ BE (POST /run hoặc theo format OpenClaw)
- [ ] Parse agentName, message, context, internalToken
- [ ] Route sang đúng agent

#### Milestone OC-2: onboarding_assistant
- [ ] System prompt cho onboarding_assistant
- [ ] Tool allowlist: 6 tools
- [ ] Test: chat onboarding → gọi get_my_checklist → trả lời đúng

#### Milestone OC-3: learning_training_agent
- [ ] System prompt cho learning_training_agent
- [ ] Tool allowlist: 8 tools
- [ ] Test: hỏi lộ trình học → gọi get_my_skills + generate_learning_path

#### Milestone OC-4: training_analytics_agent
- [ ] System prompt cho training_analytics_agent
- [ ] Tool allowlist: 8 tools
- [ ] Test: yêu cầu báo cáo → gọi get_training_overview + generate_training_report

---

## PHẦN V — KIỂM THỬ END-TO-END

---

### V.1 Test case quan trọng

| ID | Scenario | Agent | Tool calls | Expected |
|----|----------|-------|-----------|----------|
| TC-01 | "Tôi còn task onboarding nào chưa làm?" | onboarding_assistant | get_my_checklist | Danh sách task pending |
| TC-02 | "Hôm nay tôi cần liên hệ ai về IT?" | onboarding_assistant | get_support_contacts | Thông tin IT Support |
| TC-03 | "Tôi nên học khóa nào trước?" | learning_training_agent | get_my_skills, get_training_recommendations | Danh sách khóa học có gap analysis |
| TC-04 | "Tạo quiz về NodeJS cho tôi" | learning_training_agent | generate_quiz | Bộ câu hỏi quiz |
| TC-05 | "Báo cáo tiến độ đào tạo phòng Engineering" | training_analytics_agent | get_department_training_analytics | Báo cáo phòng ban |
| TC-06 | Employee cố gọi analytics agent | training_analytics_agent | — | AGENT_ACCESS_DENIED |
| TC-07 | Gọi tool vượt scope | bất kỳ | — | TOOL_ACCESS_DENIED |
| TC-08 | Token hết hạn | — | — | 401 + auto refresh |

---

### V.2 Test bảo mật bắt buộc

- [ ] FE không gọi được OpenClaw trực tiếp
- [ ] `/internal/tools/*` không accessible nếu không có internal token
- [ ] Internal token của agent onboarding không dùng được cho analytics endpoint
- [ ] Token hết hạn bị từ chối đúng cách
- [ ] User không có user_agent_access → AGENT_ACCESS_DENIED
- [ ] Scope thiếu → TOOL_ACCESS_DENIED

---

## PHẦN VI — DEFINITION OF DONE

---

### MVP Done khi:

**Backend:**
- [ ] Login / logout / refresh token hoạt động
- [ ] 3 agent group được seed
- [ ] Chat flow end-to-end với onboarding_assistant
- [ ] Ít nhất 1 tool call thành công qua internal API
- [ ] Conversation + messages được lưu DB
- [ ] InternalTokenGuard hoạt động đúng
- [ ] TraceId có mặt trong mọi request

**Frontend:**
- [ ] Login page hoạt động
- [ ] Chat UI gửi/nhận message được
- [ ] Hiển thị conversation history
- [ ] Auto token refresh hoạt động

**OpenClaw:**
- [ ] Nhận request từ backend
- [ ] Gọi được ít nhất 1 tool (get_my_checklist)
- [ ] Trả câu trả lời đúng về backend

**Bảo mật:**
- [ ] Không có internal route nào mở trần
- [ ] Internal token khác secret với user JWT
- [ ] Tool allowlist enforce đúng

---

### Full Done khi:

- [ ] Cả 3 agent hoạt động end-to-end
- [ ] Cả 22 tool được đăng ký và hoạt động
- [ ] Analytics agent chỉ dùng được cho HR/Manager
- [ ] Audit log đầy đủ
- [ ] Background jobs chạy (report generation)
- [ ] Rate limiting hoạt động
- [ ] Test coverage ≥ 70%
- [ ] Deploy trên production server

---

*Tài liệu này được viết dựa trên `AGENTS.md`, `system-workflow-architecture.md`,*
*`be/docs/architecture/backend-architecture.md`, `be/docs/architecture/backend-project-scaffold.md`,*
*`be/docs/db/project_openclaw_backend_schema_for_agent.md`, `be/docs/api/API_SPEC.md`,*
*và `be/docs/plan/PLAN.md`.*
*Khi kiến trúc thay đổi, cập nhật đồng thời `AGENTS.md` và file này.*
