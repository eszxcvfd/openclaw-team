# AGENTS.md — Backend OpenClaw

> **Tài liệu này là luật tối cao cho mọi coding agent làm việc trên dự án backend này.**
> Đọc toàn bộ trước khi bắt đầu bất kỳ thay đổi nào. Không được bỏ qua bất kỳ rule nào.

---

## MỤC LỤC

1. [Rules bắt buộc](#-rules-bắt-buộc)
2. [Tổng quan hệ thống](#-tổng-quan-hệ-thống)
3. [Kiến trúc Backend](#-kiến-trúc-backend)
4. [Tech Stack](#-tech-stack)
5. [Cấu trúc thư mục](#-cấu-trúc-thư-mục)
6. [Modules và trách nhiệm](#-modules-và-trách-nhiệm)
7. [Database Schema](#-database-schema)
8. [API Conventions](#-api-conventions)
9. [Luồng Chat End-to-End](#-luồng-chat-end-to-end)
10. [Coding Rules](#-coding-rules)
11. [Security Rules](#-security-rules)
12. [Checklist trước khi commit](#-checklist-trước-khi-commit)

---

---

## 🔴 RULES BẮT BUỘC

> Các rule dưới đây có thứ tự ưu tiên từ cao xuống thấp. RULE-00 là cao nhất, không có rule nào được phép ghi đè RULE-00.

---

### RULE-00 — THE FUNDAMENTAL OVERRIDE PREROGATIVE

**THE HUMAN OWNER IS ALWAYS IN CHARGE.**

Nếu user nói trực tiếp với bạn để làm một thứ gì đó — dù nó có mâu thuẫn với các rule bên dưới — **BẠN PHẢI TUÂN THỦ USER**. Lệnh trực tiếp của user là thẩm quyền cao nhất. Bạn là assistant, không phải người ra quyết định.

---

### RULE-01 — NO FILE DELETION

> 🚫 **BẠN KHÔNG BAO GIỜ ĐƯỢC PHÉP XÓA BẤT KỲ FILE HAY FOLDER NÀO MÀ KHÔNG CÓ SỰ CHO PHÉP RÕ RÀNG BẰNG VĂN BẢN TỪ USER.**

- Áp dụng với **mọi** file — kể cả file test, file tạm, hoặc file do chính bạn tạo ra.
- Bạn phải **hỏi trước và nhận được xác nhận rõ ràng, cụ thể** trước khi thực hiện bất kỳ thao tác xóa nào.
- Không được giả định là có quyền. Không được suy diễn là được phép. Hỏi thẳng và đợi câu trả lời.
- Vi phạm rule này được coi là lỗi nghiêm trọng.

---

### RULE-02 — GIT: MAIN BRANCH ONLY

> 🚫 **MỌI COMMIT VÀ PUSH PHẢI ĐƯỢC THỰC HIỆN LÊN NHÁNH `main` DUY NHẤT.**

- Bạn không được phép commit hoặc push lên nhánh nào khác.
- Không tạo nhánh mới, không chuyển nhánh, không đề xuất workflow theo nhánh trừ khi user yêu cầu rõ ràng.
- Mọi thao tác git (`git commit`, `git push`) phải nhắm vào `main`.

---

### RULE-03 — DATABASE CHANGES REQUIRE APPROVAL

> 🚫 **BẠN PHẢI HỎI USER TRƯỚC KHI THỰC HIỆN BẤT KỲ THAY ĐỔI NÀO VỀ DATABASE TRÊN MÔI TRƯỜNG DEPLOYED/PRODUCTION.**

- Bao gồm: chạy migration, sửa schema, seed data, xóa record, hoặc thay đổi cấu trúc bảng trên bất kỳ DB không phải local.
- Trình bày SQL hoặc migration plan chính xác, giải thích tác động, và **chờ người dùng phê duyệt rõ ràng** trước khi tiến hành.
- Người dùng quyết định. Không phải bạn.

---

---

## 🌐 TỔNG QUAN HỆ THỐNG

Hệ thống này là nền tảng AI Agent dành cho doanh nghiệp, hỗ trợ 3 nghiệp vụ chính:

| Nghiệp vụ | Mô tả |
|-----------|-------|
| **Onboarding** | Hỗ trợ nhân viên mới: checklist, FAQ, policy, danh bạ hỗ trợ |
| **Learning & Training** | Gợi ý khóa học, lộ trình học, sinh quiz, theo dõi tiến độ |
| **Training Analytics** | Phân tích feedback, báo cáo đào tạo, KPI phòng ban |

### Các thành phần chính

```
Frontend (Web Chat / Dashboard)
        │
        ▼
┌─────────────────────────────────┐
│       Backend (NestJS)          │ ← BẠN ĐANG LÀM VIỆC Ở ĐÂY
│  Auth → RBAC → Agent Router     │
│  Context Builder → OpenClaw     │
│  Tool Gateway ← Internal APIs   │
│  Business Modules               │
└──────────┬──────────────────────┘
           │
    ┌──────┴──────────┐
    ▼                 ▼
 OpenClaw          PostgreSQL
(AI Engine)        + Redis
```

### Công thức luồng tổng quát (KHÔNG ĐƯỢC THAY ĐỔI)

```
User → Frontend → POST /chat/message
  → Backend xác thực token
  → Backend kiểm tra quyền (RBAC + agent access)
  → Backend chọn agent phù hợp (Agent Router)
  → Backend xây dựng context (Context Builder)
  → Backend gọi OpenClaw (với context + message)
  → OpenClaw agent reasoning → gọi tool khi cần
  → Tool → Backend Internal API (/internal/tools/...)
  → Backend kiểm tra lại internal token + scope → query DB
  → Trả kết quả → OpenClaw → tổng hợp câu trả lời
  → Backend lưu conversation/message/tool_call_logs
  → Backend trả response về Frontend
```

> **Nguyên tắc sắt:** Agent KHÔNG BAO GIỜ được query DB trực tiếp. Agent PHẢI đi qua Tool → Internal API → Backend Service → Prisma.

---

---

## 🏗️ KIẾN TRÚC BACKEND

Backend áp dụng kiến trúc **Modular Monolith + AI Orchestrator + Tool/API Layer**.

### Phân lớp nội bộ

| Layer | Vai trò | Ví dụ |
|-------|---------|-------|
| **Controller Layer** | Nhận HTTP request, gọi service, trả response | `ChatController`, `OnboardingController` |
| **Guard / Policy Layer** | Xác thực, phân quyền | `JwtAuthGuard`, `RolesGuard`, `InternalAgentGuard` |
| **Service Layer** | Business logic | `ChatService`, `ChecklistService` |
| **Orchestrator Layer** | Điều phối AI flow | `AgentRouterService`, `ContextBuilderService`, `OpenClawService` |
| **Repository Layer** | Tương tác với DB qua Prisma | Gọi `this.prisma.xxx` trong service |
| **Integration Layer** | Kết nối external systems | `OpenClawClient`, `RedisService` |

### Nhóm module theo chức năng

```
Core Modules (sống còn)
  └── auth, iam, chat, agent-router, context-builder, tool-gateway, openclaw

Business Modules (nghiệp vụ)
  └── onboarding, training, analytics, documents

Infra Modules (hạ tầng)
  └── prisma, redis, logger, storage, jobs, health
```

### 3 nhóm Agent lớn

| Agent Group Code | Tên | Tool chính |
|-----------------|-----|------------|
| `onboarding_assistant` | Onboarding Assistant | get_my_profile, get_my_checklist, get_onboarding_faq, get_support_contacts |
| `learning_training_agent` | Learning & Training Agent | get_my_skills, get_my_courses, generate_learning_path, generate_quiz, submit_quiz |
| `training_analytics_agent` | Training Analytics Agent | get_training_overview, get_training_progress, analyze_training_feedback, generate_training_report |

---

---

## ⚙️ TECH STACK

| Thành phần | Công nghệ | Version |
|-----------|-----------|---------|
| Framework | NestJS | 11.x |
| Language | TypeScript | 5.x |
| ORM | Prisma | 7.x |
| Database | PostgreSQL (Supabase) | 16 |
| Cache / Queue | Redis + BullMQ | latest |
| HTTP Security | Helmet, CORS | latest |
| Auth | JWT (accessToken 15m + refreshToken 7d) + Passport | latest |
| Validation | class-validator + class-transformer | latest |
| AI Client | Axios → OpenClaw REST API | latest |
| Config | @nestjs/config + dotenv | latest |

### Port mặc định
- Backend: `3001`
- Database: Supabase cloud (không local)
- Redis: `6379`

---

---

## 📁 CẤU TRÚC THƯ MỤC

```
be/
├── src/
│   ├── main.ts                         # Entry point
│   ├── app.module.ts                   # Root module
│   │
│   ├── config/                         # Cấu hình
│   │   ├── env.config.ts
│   │   ├── app.config.ts
│   │   ├── db.config.ts
│   │   ├── redis.config.ts
│   │   ├── openclaw.config.ts
│   │   └── jwt.config.ts
│   │
│   ├── common/                         # Shared layer
│   │   ├── constants/                  # Hằng số toàn cục
│   │   ├── decorators/
│   │   │   ├── current-user.decorator.ts
│   │   │   └── roles.decorator.ts
│   │   ├── dto/
│   │   │   └── pagination.dto.ts
│   │   ├── enums/
│   │   │   └── index.ts                # Tất cả enum tập trung tại đây
│   │   ├── exceptions/
│   │   │   └── app.exception.ts
│   │   ├── filters/
│   │   │   └── http-exception.filter.ts
│   │   ├── guards/
│   │   │   └── roles.guard.ts
│   │   ├── interceptors/
│   │   │   └── response.interceptor.ts
│   │   ├── interfaces/
│   │   ├── pipes/
│   │   ├── types/
│   │   └── utils/
│   │       └── file.util.ts
│   │
│   ├── infra/                          # Infrastructure layer
│   │   ├── prisma/
│   │   │   ├── prisma.module.ts        # @Global()
│   │   │   └── prisma.service.ts
│   │   ├── redis/
│   │   │   ├── redis.module.ts         # @Global()
│   │   │   └── redis.service.ts
│   │   ├── logger/
│   │   └── storage/
│   │
│   └── modules/
│       ├── auth/
│       │   ├── auth.module.ts
│       │   ├── auth.controller.ts
│       │   ├── auth.service.ts
│       │   ├── dto/
│       │   ├── guards/
│       │   │   └── jwt-auth.guard.ts
│       │   └── strategies/
│       │       ├── jwt.strategy.ts
│       │       └── jwt-refresh.strategy.ts
│       │
│       ├── iam/
│       │   ├── iam.module.ts
│       │   ├── users/
│       │   ├── roles/
│       │   ├── permissions/
│       │   └── user-agent-access/
│       │
│       ├── chat/
│       │   ├── chat.module.ts
│       │   ├── chat.controller.ts
│       │   ├── chat.service.ts
│       │   ├── conversation.service.ts
│       │   ├── message.service.ts
│       │   └── dto/
│       │
│       ├── agent-router/
│       │   ├── agent-router.module.ts
│       │   ├── agent-router.service.ts
│       │   ├── policies/
│       │   └── classifiers/
│       │
│       ├── context-builder/
│       │   ├── context-builder.module.ts
│       │   ├── context-builder.service.ts
│       │   ├── user-context.service.ts
│       │   ├── session-context.service.ts
│       │   └── document-context.service.ts
│       │
│       ├── tool-gateway/
│       │   ├── tool-gateway.module.ts
│       │   ├── tool-gateway.service.ts
│       │   ├── guards/
│       │   │   └── internal-agent.guard.ts
│       │   ├── registry/
│       │   │   └── tool.registry.ts
│       │   └── tools/
│       │       ├── onboarding/
│       │       │   └── onboarding-tools.controller.ts
│       │       ├── training/
│       │       │   └── training-tools.controller.ts
│       │       └── analytics/
│       │           └── analytics-tools.controller.ts
│       │
│       ├── openclaw/
│       │   ├── openclaw.module.ts
│       │   ├── openclaw.client.ts
│       │   ├── openclaw.service.ts
│       │   └── dto/
│       │
│       ├── onboarding/
│       │   ├── onboarding.module.ts
│       │   ├── onboarding.controller.ts
│       │   ├── checklist.service.ts
│       │   ├── faq.service.ts
│       │   ├── contacts.service.ts
│       │   ├── policies.service.ts
│       │   └── dto/
│       │
│       ├── training/
│       │   ├── training.module.ts
│       │   ├── training.controller.ts
│       │   ├── skills.service.ts
│       │   ├── courses.service.ts
│       │   ├── learning-path.service.ts
│       │   ├── quiz.service.ts
│       │   ├── recommendation.service.ts
│       │   └── dto/
│       │
│       ├── analytics/
│       │   ├── analytics.module.ts
│       │   ├── analytics.controller.ts
│       │   ├── analytics.service.ts
│       │   ├── feedback.service.ts
│       │   ├── reports.service.ts
│       │   ├── snapshot.service.ts
│       │   └── dto/
│       │
│       ├── documents/
│       │   ├── documents.module.ts
│       │   └── documents.service.ts
│       │
│       ├── jobs/
│       │   ├── jobs.module.ts
│       │   ├── processors/
│       │   │   ├── report.processor.ts
│       │   │   ├── snapshot.processor.ts
│       │   │   └── context.processor.ts
│       │   ├── queues/
│       │   └── schedulers/
│       │       └── nightly.scheduler.ts
│       │
│       └── health/
│           ├── health.module.ts
│           └── health.controller.ts
│
├── prisma/
│   ├── schema.prisma                   # ĐÃ CÓ SẴN — không sửa tùy tiện
│   ├── migrations/
│   └── seed/
│
├── data/                               # Tài liệu tĩnh cho agent
│   ├── common/
│   ├── onboarding/
│   ├── training/
│   └── analytics/
│
├── generated/                          # File context & artifact tạm thời
│   ├── context/
│   │   ├── users/{user_id}/USER.md
│   │   └── sessions/{session_key}/session-context.md
│   ├── onboarding/
│   ├── training/
│   └── analytics/
│       └── reports/
│
└── docs/
    ├── api/API_SPEC.md                 # Đọc bắt buộc
    ├── architecture/backend-architecture.md
    ├── architecture/backend-project-scaffold.md
    └── db/project_openclaw_backend_schema_for_agent.md
```

---

---

## 📦 MODULES VÀ TRÁCH NHIỆM

### `auth` module

**Controller routes:**
```
POST /auth/login          # Không cần guard
POST /auth/logout         # JwtAuthGuard
POST /auth/refresh        # Không cần guard (dùng refresh token)
GET  /auth/me             # JwtAuthGuard
```

**Trách nhiệm:**
- Đăng nhập: verify email + password (bcrypt), tạo JWT access + refresh token
- Lưu refresh token hash vào `auth_sessions`
- Logout: revoke session (`revoked_at = now()`)
- Refresh: verify refresh token → tạo access token mới
- JWT payload: `{ sub: userId, email, roles: string[], sessionId }`
- `JwtAuthGuard` dùng `AuthGuard('jwt')` từ `@nestjs/passport`

---

### `iam` module

**Trách nhiệm:**
- `users/users.service.ts`: CRUD user, tìm theo email/id, soft delete (`deleted_at`)
- `roles/roles.service.ts`: Quản lý roles
- `permissions/permissions.service.ts`: Quản lý permissions
- `user-agent-access/user-agent-access.service.ts`: Kiểm tra user có quyền dùng agent group nào

**Routes (admin only — cần `JwtAuthGuard + RolesGuard + @Roles('admin')`):**
```
GET    /api/admin/users
POST   /api/admin/users
GET    /api/admin/users/:id
PATCH  /api/admin/users/:id
DELETE /api/admin/users/:id   # soft delete — phải hỏi user trước (RULE-01)
POST   /api/admin/users/:id/roles
POST   /api/admin/users/:id/agents
```

---

### `chat` module

**Controller routes:**
```
POST   /chat/message                    # JwtAuthGuard
GET    /conversations                   # JwtAuthGuard
GET    /conversations/:id/messages      # JwtAuthGuard
DELETE /conversations/:id               # JwtAuthGuard (close, không xóa)
```

**`chat.service.ts` — sendMessage() flow:**
1. Tìm hoặc tạo `conversation`
2. Lưu `user message` vào `messages`
3. Gọi `AgentRouterService.route(userId, message)` → `{ agentGroupId, agentGroupCode }`
4. Gọi `ContextBuilderService.build(...)` → context
5. Gọi `OpenClawService.chat(...)` → `{ content, toolCalls? }`
6. Lưu `assistant message` vào `messages`
7. Lưu `tool_call_logs` nếu có toolCalls
8. Trả response

---

### `agent-router` module

**Trách nhiệm:**
- Phân tích intent từ nội dung message (keyword-based)
- Kiểm tra user có quyền dùng agent group không (qua `UserAgentAccessService`)
- Trả về `agentGroupId` và `agentGroupCode`

**Intent mapping:**
| Intent keywords | Agent Group |
|----------------|-------------|
| onboarding, checklist, task, policy, faq, handbook, ngày đầu, mới vào, liên hệ | `onboarding_assistant` |
| báo cáo, report, analytics, tổng quan, phòng ban, kpi, overview, department | `training_analytics_agent` |
| khóa học, course, skill, quiz, học, lộ trình, learning path, đào tạo, kỹ năng | `learning_training_agent` |

---

### `context-builder` module

**Trách nhiệm:**
- `user-context.service.ts`: Xây dựng user context từ DB, lưu vào `user_contexts` (JSONB) và file `generated/context/users/{userId}/USER.md`
- `session-context.service.ts`: Xây dựng context cho từng session, lưu vào `session_contexts` và file `generated/context/sessions/{sessionKey}/session-context.md`
- `document-context.service.ts`: Lấy danh sách tài liệu được phép dùng theo role

**Template USER.md:**
```markdown
# User Context: {fullName}
## Thông tin cơ bản
- ID, Phòng ban, Vị trí, Ngày vào làm, Trạng thái
## Phân quyền
- Roles, Agent groups được phép
## Trạng thái Onboarding
- Tổng task, Hoàn thành, Còn lại
## Đào tạo
- Số khóa đang học
```

---

### `tool-gateway` module

**Trách nhiệm:**
- `internal-agent.guard.ts`: Xác thực `INTERNAL_AGENT_TOKEN` từ header `Authorization: Bearer <token>`
- `tool.registry.ts`: Map `toolCode → { allowedAgents[], handler serviceMethod }`
- `tool-gateway.service.ts`: Kiểm tra agent-tool permission từ `agent_group_tools`, log vào `tool_call_logs`, execute handler

**`InternalAgentGuard` phải kiểm tra:**
1. Header `Authorization: Bearer <INTERNAL_AGENT_TOKEN>`
2. Header `X-Agent-Name` phải tồn tại
3. Header `X-User-Id` phải tồn tại và là UUID hợp lệ
4. Gắn `request.agentName`, `request.agentUserId`, `request.conversationId`, `request.traceId`

**Internal API prefix bắt buộc:** `/internal/tools/{domain}/*`

---

### `openclaw` module

**Trách nhiệm:**
- `openclaw.client.ts`: HTTP client (axios) gọi OpenClaw API
- `openclaw.service.ts`: Wrapper xử lý timeout (`OPENCLAW_TIMEOUT`), retry, error

**Mock mode:** Nếu `OPENCLAW_BASE_URL` rỗng → trả mock response:
```json
{ "content": "[MOCK] Câu trả lời mock từ agent.", "toolCalls": [] }
```

---

### `onboarding` module

**External API routes (tất cả cần `JwtAuthGuard`):**
```
GET  /api/me/profile
GET  /api/me/onboarding
GET  /api/me/checklist
POST /api/me/checklist/:taskId/complete
GET  /api/faq?category=onboarding|training|general
GET  /api/contacts/support
GET  /api/policies?category=onboarding
```

**Internal Tool API routes (cần `InternalAgentGuard`, agent: `onboarding_assistant`):**
```
GET  /internal/tools/onboarding/me/profile
GET  /internal/tools/onboarding/me/onboarding
GET  /internal/tools/onboarding/me/checklist
POST /internal/tools/onboarding/me/checklist/:taskId/complete
GET  /internal/tools/onboarding/faq
GET  /internal/tools/onboarding/contacts
GET  /internal/tools/onboarding/policies
```

**Logic auto-assign checklist:**
- Khi user lần đầu lấy checklist → nếu chưa có `user_onboarding_tasks` → tìm plan phù hợp theo `position_id + department_id` → tự tạo `user_onboarding_tasks` từ plan

---

### `training` module

**External API routes (tất cả cần `JwtAuthGuard`):**
```
GET  /api/me/skills
GET  /api/me/courses?status=
GET  /api/courses?category=&level=&keyword=
GET  /api/courses/:id
GET  /api/me/training-recommendations
GET  /api/me/learning-path
POST /api/me/learning-path/generate
POST /api/quiz/generate
POST /api/quiz/submit
GET  /api/quiz/:id/result
```

**Internal Tool API routes (agent: `learning_training_agent`):**
```
GET  /internal/tools/training/me/skills
GET  /internal/tools/training/me/courses
GET  /internal/tools/training/me/learning-path
GET  /internal/tools/training/recommendations
POST /internal/tools/training/me/learning-path/generate
POST /internal/tools/training/quiz/generate
POST /internal/tools/training/quiz/submit
GET  /internal/tools/training/quiz/:id/result
```

**Skill gap algorithm:**
1. Lấy `position_id` của user → `role_skill_requirements` (danh sách skill + required level)
2. Lấy `user_skills` (danh sách skill + current level)
3. Gap = required level > current level hoặc skill chưa có
4. Tìm `courses` qua `course_skills` bù được gap
5. Exclude courses đã `completed`
6. Sort theo priority cao nhất

---

### `analytics` module

**External API routes:**
```
GET  /api/training/analytics/overview         # Admin/HR/Manager
GET  /api/training/analytics/progress?userId=
GET  /api/training/analytics/department?departmentId=
GET  /api/training/analytics/course?courseId=
GET  /api/training/feedback?courseId=&sentimentLabel=
POST /api/training/feedback/analyze           # Admin/HR
POST /api/training/reports/generate           # Admin/HR
GET  /api/training/reports
GET  /api/training/reports/:id
```

**Internal Tool API routes (agent: `training_analytics_agent`):**
```
GET  /internal/tools/analytics/overview
GET  /internal/tools/analytics/progress
GET  /internal/tools/analytics/department
GET  /internal/tools/analytics/course
GET  /internal/tools/analytics/feedback
POST /internal/tools/analytics/feedback/analyze
POST /internal/tools/analytics/reports/generate
GET  /internal/tools/analytics/reports
GET  /internal/tools/analytics/reports/:id
```

**Report generation flow (async):**
1. Tạo record `reports` trong DB
2. Đẩy job vào BullMQ queue `report-generation`
3. Trả ngay `{ reportId, status: 'generating' }`
4. Background processor: collect data → render Markdown → lưu file → update DB

---

### `jobs` module

**Background jobs:**

| Job | Trigger | Mô tả |
|-----|---------|-------|
| `report.processor` | Queue `report-generation` | Generate report file |
| `snapshot.processor` | Cron `0 2 * * *` (2AM mỗi ngày) | Tính KPI → lưu `analytics_snapshots` |
| `context.processor` | Queue `context-rebuild` | Rebuild `user_contexts` và `USER.md` |

---

---

## 🗄️ DATABASE SCHEMA

### Thông tin cơ bản

- **Database:** PostgreSQL (Supabase)
- **Schema:** `public`
- **Primary key:** UUID (`gen_random_uuid()`)
- **Email:** `CITEXT` (không phân biệt hoa thường)
- **Timestamps:** `TIMESTAMPTZ(6)` cho tất cả `created_at`, `updated_at`
- **`updated_at`** được cập nhật tự động qua trigger DB — **không cần set thủ công**
- **Soft delete:** trường `deleted_at` — không bao giờ hard delete

### Nhóm bảng

#### Nhóm Core / Auth / RBAC
| Bảng | Mô tả |
|------|-------|
| `departments` | Phòng ban |
| `positions` | Chức danh / vị trí |
| `users` | User trung tâm — email, password_hash, department, position, manager, status |
| `roles` | Role: admin, hr, manager, employee |
| `permissions` | Permission chi tiết theo resource + action |
| `role_permissions` | Map role ↔ permission |
| `user_roles` | Map user ↔ role |
| `auth_sessions` | Session đăng nhập, refresh_token_hash, revoked_at |

#### Nhóm Agent / Tool / API Access
| Bảng | Mô tả |
|------|-------|
| `agent_groups` | 3 agent lớn (onboarding_assistant, learning_training_agent, training_analytics_agent) |
| `agent_submodules` | Chức năng con của từng agent |
| `user_agent_access` | User nào được phép dùng agent nào |
| `tools` | Danh mục tool với `input_schema`, `output_schema` (JSONB) |
| `agent_group_tools` | Agent group nào được dùng tool nào |
| `backend_api_catalog` | Catalog API backend (method + path) |
| `service_tokens` | Token nội bộ cho agent/tool (`INTERNAL_AGENT_TOKEN`) |
| `tool_call_logs` | Log toàn bộ tool call: request/response payload, success, error |

#### Nhóm Chat / Conversation
| Bảng | Mô tả |
|------|-------|
| `conversations` | Cuộc trò chuyện: user, agent_group, session_key, status |
| `messages` | Tin nhắn: sender_type (user/assistant/system/tool), content, metadata |

#### Nhóm Context / Document
| Bảng | Mô tả |
|------|-------|
| `documents` | Metadata tài liệu, file_path hoặc content_text/content_json |
| `document_permissions` | Role nào được xem tài liệu nào |
| `user_contexts` | Context tổng hợp theo user (JSONB) |
| `session_contexts` | Context theo phiên chat (JSONB) |
| `generated_artifacts` | Output sinh tự động: learning path, quiz, report summary (JSONB) |

#### Nhóm Onboarding
| Bảng | Mô tả |
|------|-------|
| `onboarding_plans` | Kế hoạch onboarding mẫu theo phòng ban/vị trí |
| `onboarding_tasks` | Task trong plan: code, thứ tự, ngày hạn, doc hướng dẫn |
| `user_onboarding_tasks` | Task thực tế của user: status, completed_at, notes |
| `faq_items` | FAQ nội bộ theo category |
| `contacts_directory` | Danh bạ hỗ trợ |
| `company_policies` | Metadata policy, link tới documents |

#### Nhóm Learning / Training
| Bảng | Mô tả |
|------|-------|
| `skills` | Danh mục kỹ năng |
| `user_skills` | Kỹ năng hiện tại của user, level |
| `role_skill_requirements` | Kỹ năng yêu cầu cho từng position |
| `courses` | Danh mục khóa học |
| `course_skills` | Khóa học phát triển kỹ năng nào |
| `course_prerequisites` | Điều kiện tiên quyết giữa khóa học |
| `user_courses` | Tiến độ học: status, progress_percent, score |
| `learning_paths` | Lộ trình học mẫu |
| `learning_path_items` | Các bước trong learning path |
| `user_learning_paths` | Learning path cá nhân hóa (JSONB) |
| `quiz_templates` | Mẫu quiz |
| `quiz_questions` | Ngân hàng câu hỏi (options_json, answer_key_json) |
| `quiz_attempts` | Bài làm quiz của user (submitted_answers JSONB, score) |

#### Nhóm Analytics / Reporting
| Bảng | Mô tả |
|------|-------|
| `training_sessions` | Phiên đào tạo |
| `training_attendance` | Điểm danh |
| `training_feedback` | Feedback sau đào tạo: rating, comment, sentiment, topics_json |
| `reports` | Báo cáo đã sinh: type, period, file_path, summary_json |
| `analytics_snapshots` | KPI snapshot theo ngày/phòng ban/vị trí |

---

---

## 📡 API CONVENTIONS

### Routing bắt buộc

```
# Không có global prefix /api
# Controller tự đặt route:

/auth/*                          → AuthController
/chat/*                          → ChatController
/conversations/*                 → ConversationController
/health                          → HealthController
/api/me/*                        → OnboardingController, TrainingController
/api/courses/*                   → TrainingController
/api/quiz/*                      → TrainingController
/api/faq                         → OnboardingController
/api/contacts/*                  → OnboardingController
/api/policies                    → OnboardingController
/api/training/analytics/*        → AnalyticsController
/api/training/feedback           → AnalyticsController
/api/training/reports/*          → AnalyticsController
/api/admin/*                     → IamController (admin only)
/internal/tools/onboarding/*     → OnboardingToolsController
/internal/tools/training/*       → TrainingToolsController
/internal/tools/analytics/*      → AnalyticsToolsController
```

> **CRITICAL:** Không được dùng `app.setGlobalPrefix('api')` trong `main.ts`.

### Response format bắt buộc — TOÀN BỘ API PHẢI THEO FORMAT NÀY

```json
// Thành công
{
  "success": true,
  "data": {},
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 100
  }
}

// Lỗi
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Mô tả lỗi"
  }
}
```

### Error codes chuẩn

| Code | HTTP Status | Ý nghĩa |
|------|-------------|---------|
| `UNAUTHORIZED` | 401 | Token không hợp lệ / hết hạn |
| `FORBIDDEN` | 403 | Không có quyền |
| `VALIDATION_ERROR` | 400 | Request không đúng format |
| `NOT_FOUND` | 404 | Resource không tồn tại |
| `AGENT_ACCESS_DENIED` | 403 | User không được dùng agent đó |
| `TOOL_ACCESS_DENIED` | 403 | Agent không được dùng tool đó |
| `OPENCLAW_TIMEOUT` | 504 | OpenClaw không phản hồi |
| `INTERNAL_ERROR` | 500 | Lỗi server |

### Internal Tool API headers bắt buộc

```http
Authorization: Bearer <INTERNAL_AGENT_TOKEN>
X-Agent-Name: onboarding_assistant | learning_training_agent | training_analytics_agent
X-User-Id: <uuid>
X-Conversation-Id: <uuid>
X-Trace-Id: <string>
```

### Authentication

| Loại API | Auth mechanism |
|----------|---------------|
| External API | `Authorization: Bearer <user_jwt_access_token>` |
| Internal Tool API | `Authorization: Bearer <INTERNAL_AGENT_TOKEN>` (env variable) |

---

---

## 🔄 LUỒNG CHAT END-TO-END

```
1. POST /chat/message
   Headers: Authorization: Bearer <user_jwt>
   Body: { conversationId?: string, message: string }

2. JwtAuthGuard xác thực → lấy currentUser từ JWT

3. ChatService.sendMessage():
   a. findOrCreate conversation
   b. save user message → messages table
   c. AgentRouterService.route(userId, message)
      → Keyword classify → check user_agent_access → return { agentGroupId, agentGroupCode }
   d. ContextBuilderService.build(userId, agentGroupCode, conversationId)
      → Build user_contexts + session_contexts
      → Generate USER.md + session-context.md
      → Return { userContext, sessionContext, allowedTools, sessionKey }
   e. OpenClawService.chat({
        agentGroup: agentGroupCode,
        userContext: USER.md content,
        sessionContext: session-context.md content,
        message: dto.message,
        conversationId,
        tools: allowedTools
      })
      → Return { content, toolCalls?: [] }
   f. If toolCalls → ToolGatewayService.execute() cho từng tool call
      → Mỗi tool gọi đúng service nội bộ
      → Log vào tool_call_logs
   g. save assistant message → messages table
   h. Return response

4. ResponseInterceptor wrap → { success: true, data: { conversationId, content, agentGroup, ... } }
```

---

---

## ✅ CODING RULES

### Prisma

```typescript
// ✅ ĐÚNG — dùng relations
const user = await this.prisma.users.findUnique({
  where: { id: userId, deleted_at: null },
  include: {
    departments: true,
    positions: true,
    user_roles: { include: { roles: true } },
  },
});

// ✅ ĐÚNG — pagination
const [items, total] = await this.prisma.$transaction([
  this.prisma.courses.findMany({
    where: filters,
    skip: (page - 1) * limit,
    take: limit,
    orderBy: { created_at: 'desc' },
  }),
  this.prisma.courses.count({ where: filters }),
]);

// ✅ ĐÚNG — soft delete
await this.prisma.users.update({
  where: { id: userId },
  data: { deleted_at: new Date(), status: 'inactive' },
});

// ❌ SAI — không dùng raw SQL trừ khi bắt buộc
await this.prisma.$queryRaw`SELECT * FROM users`; // Tránh

// ❌ SAI — quên check deleted_at
const user = await this.prisma.users.findUnique({ where: { id } }); // Thiếu deleted_at: null
```

### NestJS Module

```typescript
// ✅ ĐÚNG — Export service nếu module khác cần dùng
@Module({
  providers: [ChecklistService],
  exports: [ChecklistService],  // Bắt buộc nếu cần share
})

// ✅ ĐÚNG — PrismaModule và RedisModule đã @Global(), không cần import lại
// ❌ SAI — import PrismaModule trong từng module con
```

### DTO Validation

```typescript
// ✅ ĐÚNG — dùng class-validator
export class LoginDto {
  @IsEmail()
  @Transform(({ value }) => value.toLowerCase().trim())
  email: string;

  @IsString()
  @MinLength(6)
  @MaxLength(100)
  password: string;
}

// ❌ SAI — không validate
export class LoginDto {
  email: string;
  password: string;
}
```

### Controller pattern

```typescript
// ✅ ĐÚNG
@Controller('api/me')
@UseGuards(JwtAuthGuard)
export class OnboardingController {
  @Get('checklist')
  async getChecklist(@CurrentUser() user: JwtPayload) {
    return this.checklistService.getForUser(user.sub);
  }
}

// ❌ SAI — trả data thô, không đồng nhất
@Get('checklist')
async getChecklist() {
  const items = await this.service.get();
  return items; // Response interceptor sẽ wrap, nhưng phải nhất quán
}
```

### Enums

```typescript
// ✅ ĐÚNG — dùng enum từ src/common/enums/index.ts
import { UserStatus, CourseStatus } from '@/common/enums';

// ❌ SAI — hardcode string
if (user.status === 'active') { ... }  // Phải dùng UserStatus.ACTIVE
```

### File Utilities

```typescript
// ✅ ĐÚNG — dùng util để write file
import { writeFile } from '@/common/utils/file.util';
await writeFile(filePath, content);  // Tự tạo thư mục nếu chưa có

// ❌ SAI — dùng trực tiếp fs.writeFileSync
import * as fs from 'fs';
fs.writeFileSync(filePath, content); // Không tạo dir, dễ crash
```

### Service layer

```typescript
// ✅ ĐÚNG — service inject PrismaService
@Injectable()
export class ChecklistService {
  constructor(private readonly prisma: PrismaService) {}
  // PrismaService là @Global() nên không cần import PrismaModule
}

// ❌ SAI — controller query DB trực tiếp
@Controller()
export class MyController {
  constructor(private prisma: PrismaService) {}
  @Get() async get() {
    return this.prisma.users.findMany(); // Logic phải ở service!
  }
}
```

---

---

## 🔒 SECURITY RULES

### 1. Không bao giờ expose INTERNAL routes ra ngoài
- Route `/internal/*` phải luôn có `InternalAgentGuard`
- Không được để route `/internal/*` không có guard

### 2. Luôn check owner
- External API phải đảm bảo user chỉ xem được dữ liệu của chính mình
- Ví dụ: `GET /api/me/checklist` → `WHERE user_id = currentUser.id` (không lấy của người khác)

### 3. Soft delete — không hard delete
- Tất cả delete phải là soft delete (`deleted_at = now()`)
- Luôn thêm `deleted_at: null` vào mọi query findUnique/findFirst/findMany

### 4. Admin routes
- Mọi route `/api/admin/*` phải có `@UseGuards(JwtAuthGuard, RolesGuard)` và `@Roles('admin')`

### 5. Internal token không share với user
- `INTERNAL_AGENT_TOKEN` chỉ dùng cho `InternalAgentGuard`
- Không bao giờ trả token này ra response public
- Không bao giờ để user JWT token qua internal routes

### 6. Tool-agent permission
- Mỗi tool call phải check `agent_group_tools` trong DB
- Nếu agent không được phép dùng tool → throw `TOOL_ACCESS_DENIED`

### 7. Log toàn bộ tool calls
- Mỗi lần tool được gọi → tạo record `tool_call_logs` với đầy đủ: request_payload, response_payload, success, error_message, started_at, finished_at

---

---

## ✔️ CHECKLIST TRƯỚC KHI COMMIT

Trước mỗi commit, tự kiểm tra:

- [ ] `npm run build` không có error TypeScript
- [ ] `npm run dev` chạy được, không crash
- [ ] Không có `console.log` debug còn lại trong code production
- [ ] Mọi response đều theo format `{ success, data, meta? }` hoặc `{ success, error }`
- [ ] Mọi route bảo mật đã có guard phù hợp
- [ ] Không có route `/internal/*` nào thiếu `InternalAgentGuard`
- [ ] Mọi Prisma query có `deleted_at: null` khi cần
- [ ] Không hardcode secret, token, password trong code
- [ ] Enums dùng từ `src/common/enums/index.ts`
- [ ] DTO có đủ validation decorators
- [ ] Module export service đúng nếu có module khác cần dùng

---

## 📚 TÀI LIỆU BẮT BUỘC ĐỌC TRƯỚC KHI CODE

| File | Mô tả |
|------|-------|
| `docs/api/API_SPEC.md` | **Toàn bộ API spec**, request/response JSON mẫu, mapping DB |
| `docs/architecture/backend-architecture.md` | Kiến trúc backend, vai trò từng module |
| `docs/architecture/backend-project-scaffold.md` | Cấu trúc project, quy ước code |
| `docs/db/project_openclaw_backend_schema_for_agent.md` | Giải thích chi tiết schema DB |
| `system-workflow-architecture.md` | (ở root) Workflow toàn bộ hệ thống FE+BE+OpenClaw |
| `AGENTS.md` | **File này** — đọc đầu tiên |

---

*Cập nhật lần cuối: 2026-03-21*
