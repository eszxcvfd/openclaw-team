# AGENTS.md

## Hướng dẫn Agent cho Toàn bộ Hệ thống OpenClaw

> File này là tài liệu gốc cho **coding agent** và **AI agent** khi làm việc với bất kỳ phần nào của hệ thống.
> Mọi agent đều PHẢI đọc và tuân thủ tài liệu này trước khi bắt đầu code.

---

## 1. Mục tiêu và phạm vi

File này định nghĩa:

- Kiến trúc tổng thể bắt buộc của hệ thống
- Vai trò và trách nhiệm từng layer
- Các quy tắc bắt buộc (RULE) không được phá vỡ
- Luồng dữ liệu và luồng phân quyền chuẩn
- Cách coding agent phải hiểu và triển khai từng phần

Hệ thống gồm các phần chính:

```text
project-root/
  fe/           → Frontend (chat UI, dashboard)
  be/           → Backend (control plane chính)
  openclaw/     → AI Agent Engine
  data/         → Tài liệu tĩnh (handbook, FAQ, policy, course content)
  generated/    → File context và file sinh ra theo user/session
```

---

## 2. Kiến trúc tổng quát

### Nguyên tắc cốt lõi

Hệ thống hoạt động theo mô hình **Backend-Controlled AI Orchestration**:

```
Frontend → Backend → OpenClaw Agent → Tool → Internal API → DB/Data
                         ↑                        ↓
                         ←←←←←←←←←←←←←←←←←←←←←←←
```

**Công thức toàn bộ luồng:**

```
User → FE → BE → OpenClaw → Tool → BE Internal API → Service → DB/Data
                                                              ↓
User ← FE ← BE ←←←←←←←←←← OpenClaw ←←←←←←←←←←←←←←←←←←←←←
```

### Vai trò từng phần

| Layer            | Vai trò chính                                                     | Không được làm                                        |
| ---------------- | ----------------------------------------------------------------- | ----------------------------------------------------- |
| **Frontend**     | UI chat, gọi external API backend, hiển thị kết quả               | Gọi OpenClaw trực tiếp, giữ logic permission, gọi DB  |
| **Backend**      | Auth, RBAC, agent routing, context building, internal APIs, audit | Để FE gọi OpenClaw, để OpenClaw gọi DB trực tiếp      |
| **OpenClaw**     | Reasoning, gọi tool được cấp phép, tổng hợp câu trả lời           | Login user, tự suy quyền, cầm token user thật, gọi DB |
| **Tool Layer**   | Chuẩn hóa cách agent gọi nghiệp vụ, map sang internal API         | Bypass backend API, tự query DB                       |
| **Internal API** | Cổng chính agent lấy dữ liệu thật, query DB, kiểm tra permission  | Mở trần không auth, bypass permission check           |
| **DB/Data**      | Source of truth cho toàn hệ thống                                 | —                                                     |

---

## 3. Các quy tắc bắt buộc (RULES)

### RULE-01 — Frontend không gọi OpenClaw trực tiếp

Luồng đúng duy nhất:

```
FE → BE (external API) → BE gọi OpenClaw
```

Không có route nào để FE gọi `/openclaw/*` hay bất kỳ endpoint OpenClaw nào.

---

### RULE-02 — Backend là security boundary chính của toàn hệ thống

Backend là nơi giữ và enforce tất cả:

- Xác thực user (auth)
- Phân quyền theo role (RBAC)
- Kiểm soát agent nào user được dùng
- Kiểm soát tài liệu nào user được xem
- Kiểm soát scope tool nào agent được gọi
- Audit log mọi thao tác quan trọng
- Context building cho từng phiên

---

### RULE-03 — OpenClaw chỉ là AI worker

OpenClaw **chỉ được phép**:

- Đọc context backend cung cấp
- Reasoning và lập kế hoạch gọi tool
- Gọi tool trong danh sách được cấp phép
- Tổng hợp kết quả và viết câu trả lời

OpenClaw **không được phép**:

- Tự xử lý login doanh nghiệp
- Tự suy ra hay tự cấp quyền nghiệp vụ
- Cầm token user thật (user_access_token)
- Query DB trực tiếp
- Gọi bất kỳ API nào không phải internal tool API được cấp phép

---

### RULE-04 — Agent không query DB trực tiếp

Luồng đúng bắt buộc:

```
Agent → Tool → Internal API Backend → Service → Repository → DB
```

Mọi dữ liệu nghiệp vụ phải đi qua ít nhất 3 lớp trung gian trên.

---

### RULE-05 — Không dùng token user thật cho OpenClaw

Luồng token đúng:

1. FE gửi `user_access_token` cho BE
2. BE verify token → biết user là ai
3. BE tạo `internal_scoped_token` ngắn hạn (JWT riêng, secret riêng)
4. BE gửi `internal_scoped_token` sang OpenClaw
5. OpenClaw dùng token đó khi gọi `/internal/tools/*`

`internal_scoped_token` bắt buộc phải có:

```json
{
  "agent": "onboarding_assistant",
  "userId": "uuid",
  "conversationId": "uuid",
  "scope": ["read:onboarding", "read:checklist"],
  "iat": 1711000000,
  "exp": 1711003600,
  "jti": "unique-token-id"
}
```

Cấm dùng:

- Token user thật cho OpenClaw
- Một token env cố định (`INTERNAL_AGENT_TOKEN`) chung cho mọi request

---

### RULE-06 — DB là source of truth duy nhất

- `data/` chỉ là tài liệu gốc tĩnh → không thay thế DB
- `generated/` chỉ là context hỗ trợ tạm thời → không làm nguồn nghiệp vụ chính
- Mọi dữ liệu sống (user, progress, quiz, report) đều phải lưu DB

---

### RULE-07 — Không hardcode permission ở bất kỳ đâu

- Không hardcode role check trong controller
- Không hardcode permission trong FE
- Không để OpenClaw tự suy quyền doanh nghiệp
- Mọi permission phải đi qua: guard → policy service → permission service → DB

---

### RULE-08 — Mỗi agent chỉ được cấp đúng tool cần thiết

- `onboarding_assistant` chỉ dùng tool onboarding
- `learning_training_agent` chỉ dùng tool training
- `training_analytics_agent` chỉ dùng tool analytics
- Không cấp tool dư thừa cho bất kỳ agent nào
- Allowlist tool phải được cấu hình rõ trong `agent_group_tools`

---

### RULE-09 — Mọi request quan trọng phải có trace id

Tất cả request từ FE → BE → OpenClaw → Tool → Internal API phải mang:

- `traceId` (correlation id xuyên suốt)
- `conversationId`
- `userId`
- `agentGroup`
- `toolName` (nếu là tool call)

---

### RULE-10 — Không trộn external API và internal tool API

```text
External API   → /auth/* /chat/* /conversations/* /me/* /api/*
Internal API   → /internal/tools/onboarding/* /internal/tools/training/* /internal/tools/analytics/*
```

Hai loại route này phải hoàn toàn tách biệt về:

- Namespace / prefix
- Guard / middleware xác thực
- Token loại được chấp nhận

---

### RULE-11 — Agent team bắt buộc phải sử dụng các sub agent để xử lý công việc

Agent chính phải lập kế hoạch phân chia công việc và gọi các sub-agent phù hợp để thực thi.
Agent chính không được tự xử lý toàn bộ công việc, mà chỉ chịu trách nhiệm:

1. Lập kế hoạch phân công sub-agent
2. Điều phối quá trình thực thi
3. Kiểm tra và tổng hợp kết quả cuối cùng

## 4. Layer chi tiết

### 4.1 Frontend Layer (`fe/`)

**Được làm:**

- Login UI / logout
- Chat UI (gửi message, hiển thị hội thoại)
- Gọi external API của backend bằng `user_access_token`
- Hiển thị checklist, learning path, báo cáo
- Hiển thị lịch sử hội thoại

**Không được làm:**

- Gọi OpenClaw trực tiếp
- Giữ logic permission chính
- Gọi internal tool API
- Gọi DB trực tiếp
- Hardcode permission, role trong FE code

---

### 4.2 Backend Layer (`be/`)

Backend là **control plane chính** của toàn hệ thống.

**Các module bắt buộc phải có:**

| Module            | Trách nhiệm                                                                       |
| ----------------- | --------------------------------------------------------------------------------- |
| `auth`            | Login, logout, refresh token, verify JWT, session management                      |
| `iam`             | Users, roles, permissions, role_permissions, user_roles, user_agent_access        |
| `chat`            | Conversations, messages, session metadata, chat entry point                       |
| `agent-router`    | Route request sang đúng agent group, kiểm tra user có quyền dùng agent, phân loại hybrid (fixed intent → Google model fallback) |
| `context-builder` | Build user context, session context, allowed resources, sinh USER.md              |
| `tool-gateway`    | Đăng ký tool, map tool → service, kiểm tra tool access theo agent, log tool calls |
| `openclaw-client` | Gọi OpenClaw, truyền context + token, nhận response                               |
| `onboarding`      | Business services: plans, tasks, FAQ, contacts, policies                          |
| `training`        | Business services: skills, courses, learning path, quiz, recommendations          |
| `analytics`       | Business services: progress, feedback, reports, KPI snapshots                     |
| `documents`       | Document metadata, document permissions                                           |
| `audit`           | Audit trail, security logs, tool usage logs, agent routing logs                   |
| `jobs`            | Background jobs: generate report, analyze feedback batch, cleanup                 |

**Tầng kiến trúc nội bộ backend:**

```
Controller Layer    → validate request, trả response
Guard / Policy      → authentication, authorization, RBAC, agent access
Service Layer       → xử lý nghiệp vụ
Orchestrator Layer  → chọn agent, build context, gọi OpenClaw, gom kết quả
Repository Layer    → làm việc với DB (thông qua ORM)
Integration Layer   → OpenClaw, Redis, file system, queue
```

**Quy tắc coding backend bắt buộc:**

- Controller chỉ validate request cơ bản, gọi service, trả response
- Không query DB trực tiếp từ controller
- Không hardcode permission trong controller
- Permission phải đi qua guard → policy service → permission service

**Quy tắc phân loại agent bắt buộc:**

- Backend orchestrator phải phân loại theo cơ chế **hybrid**
- Bước 1: lọc trước danh sách agent user được phép dùng bằng `user_agent_access`, role, permission, policy
- Bước 2: chạy classifier rule-based với tập `intent` cố định của hệ thống
- Bước 3: nếu rule-based không match rõ hoặc câu hỏi mơ hồ / đa ý, backend mới được gọi model Google để classify
- Model classify phải dùng `GEMINI_API_KEY`; có thể chấp nhận `GOOGLE_API_KEY` như alias / fallback env
- Google classifier chỉ được chọn trong tập agent đã pass bước phân quyền
- Nếu confidence thấp thì backend phải hỏi lại user hoặc fallback về agent an toàn hơn trong tập agent được phép; không được vượt quyền để “đoán”

---

### 4.3 OpenClaw Layer (`openclaw/`)

OpenClaw là **AI worker engine** được backend điều phối.

**Input từ backend:**

- `agentName`: tên agent group cần chạy
- `message`: message của user
- `context`: user context, session context, allowed resources
- `internalToken`: `internal_scoped_token` để gọi internal tool API

**Output trả về backend:**

- Final answer (text)
- Tool calls đã thực hiện
- Metadata phiên

**Tổ chức agent trong OpenClaw:**

OpenClaw chỉ chạy 3 agent lớn:

```
onboarding_assistant
  ├── Employee Guide
  ├── Onboarding Checklist
  └── New Hire FAQ

learning_training_agent
  ├── Training Recommendation
  ├── Learning Path
  └── Quiz Generator

training_analytics_agent
  ├── Feedback Analysis
  ├── Progress Tracking
  └── Training Report
```

**Quy tắc agent trong OpenClaw:**

- Mỗi agent đọc system prompt + context từ backend
- Mỗi agent chỉ được gọi tool trong allowlist đã được cấp
- Không có agent nào được gọi tool ngoài nhóm nghiệp vụ của mình
- Agent không tự kết luận về permission doanh nghiệp

---

### 4.4 Tool Layer

Tool là lớp trung gian giữa agent và Backend Internal API.

**Cách Tool hoạt động:**

```
Agent chọn Tool
  → Tool nhận tham số
  → Tool gọi Backend Internal API với internal_scoped_token
  → Nhận dữ liệu trả về
  → Trả kết quả về Agent
```

**Mapping Tool → Internal API:**

| Tool name                           | Internal API endpoint                                           |
| ----------------------------------- | --------------------------------------------------------------- |
| `get_my_profile`                    | `GET /internal/tools/onboarding/me/profile`                     |
| `get_my_onboarding`                 | `GET /internal/tools/onboarding/me/onboarding`                  |
| `get_my_checklist`                  | `GET /internal/tools/onboarding/me/checklist`                   |
| `get_onboarding_faq`                | `GET /internal/tools/onboarding/faq`                            |
| `get_support_contacts`              | `GET /internal/tools/onboarding/contacts/support`               |
| `complete_checklist_task`           | `POST /internal/tools/onboarding/me/checklist/:taskId/complete` |
| `get_my_skills`                     | `GET /internal/tools/training/me/skills`                        |
| `get_my_courses`                    | `GET /internal/tools/training/me/courses`                       |
| `get_my_learning_path`              | `GET /internal/tools/training/me/learning-path`                 |
| `get_training_recommendations`      | `GET /internal/tools/training/me/training-recommendations`      |
| `generate_learning_path`            | `POST /internal/tools/training/me/learning-path/generate`       |
| `generate_quiz`                     | `POST /internal/tools/training/quiz/generate`                   |
| `submit_quiz`                       | `POST /internal/tools/training/quiz/submit`                     |
| `get_quiz_result`                   | `GET /internal/tools/training/quiz/:id/result`                  |
| `get_training_overview`             | `GET /internal/tools/analytics/training/overview`               |
| `get_training_progress`             | `GET /internal/tools/analytics/training/progress`               |
| `get_department_training_analytics` | `GET /internal/tools/analytics/training/department`             |
| `get_training_feedback`             | `GET /internal/tools/analytics/training/feedback`               |
| `analyze_training_feedback`         | `POST /internal/tools/analytics/training/feedback/analyze`      |
| `generate_training_report`          | `POST /internal/tools/analytics/training/reports/generate`      |
| `list_training_reports`             | `GET /internal/tools/analytics/training/reports`                |
| `get_training_report_detail`        | `GET /internal/tools/analytics/training/reports/:id`            |

---

### 4.5 Data Layer

Gồm 3 phần:

#### PostgreSQL (source of truth)

Nhóm bảng chính trong schema `app`:

**Core / Auth / RBAC:**

- `users`, `departments`, `positions`
- `roles`, `permissions`, `role_permissions`, `user_roles`
- `auth_sessions`

**Agent / Tool / API Access Control:**

- `agent_groups` (seed: `onboarding`, `learning_training`, `training_analytics`)
- `agent_submodules`, `user_agent_access`
- `backend_api_catalog`, `tools`, `agent_group_tools`
- `service_tokens`, `tool_call_logs`

**Document / Knowledge / Context:**

- `documents`, `document_permissions`
- `user_contexts`, `session_contexts`, `generated_artifacts`

**Chat / Conversation:**

- `conversations`, `messages`

**Onboarding:**

- `onboarding_plans`, `onboarding_tasks`, `user_onboarding_tasks`
- `faq_items`, `contacts_directory`, `company_policies`

**Learning / Training:**

- `skills`, `user_skills`, `role_skill_requirements`
- `courses`, `course_skills`, `course_prerequisites`, `user_courses`
- `learning_paths`, `learning_path_items`, `user_learning_paths`
- `quiz_templates`, `quiz_questions`, `quiz_attempts`

**Analytics / Feedback / Reporting:**

- `training_sessions`, `training_attendance`
- `training_feedback`, `reports`, `analytics_snapshots`

**Đặc điểm schema:**

- Tất cả bảng nằm trong schema `app`
- `UUID` là khóa chính chuẩn
- Email dùng `CITEXT` (không phân biệt hoa thường)
- `JSONB` cho context động, payload agent, schema tool input/output
- Trigger `set_updated_at()` tự cập nhật `updated_at`

#### Folder `data/`

Chứa tài liệu tĩnh / bán tĩnh:

```text
data/
  common/
    company-overview.md
    org-structure.md
    policies-overview.md
    glossary.md
  onboarding/
    employee-handbook.md
    company-policies.md
    first-day-guide.md
    checklist-template.md
    faq.md
    tools-guide.md
    support-contacts.md
  training/
    course-catalog.md
    skill-matrix.md
    learning-paths.md
    quiz-rules.md
    evaluation-rubric.md
    course-content/
  analytics/
    report-template.md
    kpi-rules.md
    sentiment-rules.md
    dashboard-metrics.md
```

#### Folder `generated/`

Chứa file được tạo ra theo user hoặc session:

```text
generated/
  context/
    users/{user_id}/USER.md
    sessions/{session_id}/session-context.md
  onboarding/
    {user_id}/onboarding-summary.md
  training/
    {user_id}/learning-path.md
    {user_id}/quiz-{quiz_id}.json
  analytics/
    reports/{report_id}.md
```

`generated/` chỉ dùng hỗ trợ context, **không phải nguồn dữ liệu chính**.

---

## 5. Luồng chuẩn toàn hệ thống (step-by-step)

### Giai đoạn 1 — Đăng nhập

```
1. User mở FE, nhập email + password
2. FE POST /auth/login → BE
3. BE verify credentials với DB (bảng users)
4. BE lấy: userId, role, department, position, agent access
5. BE tạo access_token + refresh_token
6. BE trả token về FE
7. FE lưu token, chuyển vào màn hình chat
```

### Giai đoạn 2 — Gửi message

```
1. User nhập câu hỏi, FE POST /chat/message với Authorization: Bearer <user_access_token>
2. BE AuthGuard verify token
3. BE kiểm tra: userId, role, agent access qua RBAC
4. BE phân loại intent sơ bộ theo cơ chế hybrid → route sang agent group:
   - match `intent` cố định trước
   - nếu không rõ thì dùng Google model classifier ở backend
   - chỉ được chọn trong tập agent user có quyền dùng
   - ví dụ:
     - câu hỏi onboarding → onboarding_assistant
     - câu hỏi training → learning_training_agent
     - câu hỏi báo cáo → training_analytics_agent
```

### Giai đoạn 3 — Build context

```
5. BE ContextBuilder query DB:
   - user profile
   - role & permissions
   - onboarding status / training status
   - allowed documents
   - conversation history
6. BE sinh:
   - user context (JSON hoặc USER.md)
   - session context
   - allowed resources list
```

### Giai đoạn 4 — Tạo internal token và gọi OpenClaw

```
7. BE InternalTokenService tạo internal_scoped_token:
   {
     agent: "onboarding_assistant",
     userId: "...",
     conversationId: "...",
     scope: ["read:onboarding", "read:checklist"],
     exp: now + 1h,
     jti: "unique-id"
   }
8. BE OpenClawClient gọi OpenClaw:
   {
     agentName: "onboarding_assistant",
     message: "...",
     context: { user: {...}, session: {...}, allowedResources: [...] },
     internalToken: "<internal_scoped_token>"
   }
```

### Giai đoạn 5 — OpenClaw xử lý

```
9. OpenClaw đọc message + context
10. Agent reasoning: có cần gọi tool không?
11. Nếu cần dữ liệu → agent gọi tool (ví dụ: get_my_checklist)
```

### Giai đoạn 6 — Tool gọi Internal API

```
12. Tool gọi BE Internal API:
    GET /internal/tools/onboarding/me/checklist
    Authorization: Bearer <internal_scoped_token>
    X-Agent-Name: onboarding_assistant
    X-User-Id: ...
    X-Conversation-Id: ...
    X-Trace-Id: ...

13. BE InternalGuard verify:
    - signature của token
    - audience / issuer
    - expiry
    - agent đúng group (onboarding_assistant)
    - scope hợp lệ
    - userId tồn tại

14. BE Service query DB → lọc theo user + permission
15. BE trả JSON về Tool
16. Tool trả kết quả về Agent
```

### Giai đoạn 7 — Tổng hợp và trả kết quả

```
17. Nếu còn thiếu dữ liệu → Agent gọi thêm tool (lặp lại bước 11-16)
18. Agent tổng hợp đủ dữ liệu → sinh câu trả lời cuối
19. OpenClaw trả response về BE
20. BE nhận response:
    - lưu user message vào DB (bảng messages)
    - lưu assistant message vào DB
    - lưu tool_call_logs nếu có tool call
    - lưu audit log
21. BE format response và trả FE
22. FE hiển thị câu trả lời cho user
```

---

## 6. Workflow từng nhóm Agent

### 6.1 onboarding_assistant

**Input thường gặp:**

- Hỏi về quy trình ngày đầu, checklist còn thiếu
- Hỏi policy nội bộ, người liên hệ hỗ trợ
- Hỏi FAQ onboarding

**Nguồn dữ liệu agent được phép truy cập:**

- `onboarding_plans`, `onboarding_tasks`, `user_onboarding_tasks`
- `faq_items`, `contacts_directory`, `company_policies`
- `data/onboarding/*`

**Tool được cấp:**

- `get_my_profile`
- `get_my_onboarding`
- `get_my_checklist`
- `get_onboarding_faq`
- `get_support_contacts`
- `complete_checklist_task`

**Output:**

- Danh sách task chưa hoàn thành
- Hướng dẫn từng bước onboarding
- Câu trả lời FAQ
- Thông tin liên hệ hỗ trợ

---

### 6.2 learning_training_agent

**Input thường gặp:**

- Nên học khóa nào trước?
- Lộ trình học của tôi là gì?
- Tạo quiz cho kỹ năng X
- Xem tiến độ học cá nhân

**Nguồn dữ liệu agent được phép truy cập:**

- `skills`, `user_skills`, `role_skill_requirements`
- `courses`, `course_skills`, `course_prerequisites`, `user_courses`
- `learning_paths`, `learning_path_items`, `user_learning_paths`
- `quiz_templates`, `quiz_questions`, `quiz_attempts`
- `data/training/*`

**Tool được cấp:**

- `get_my_skills`
- `get_my_courses`
- `get_my_learning_path`
- `get_training_recommendations`
- `generate_learning_path`
- `generate_quiz`
- `submit_quiz`
- `get_quiz_result`

**Output:**

- Khóa học đề xuất có gap analysis
- Learning path cá nhân hóa
- Bài quiz theo skill hoặc course
- Kết quả / điểm quiz

---

### 6.3 training_analytics_agent

**Input thường gặp:**

- Báo cáo tiến độ đào tạo toàn công ty / phòng ban
- Phân tích feedback đào tạo
- Xem KPI đào tạo tháng này
- Sinh file báo cáo đào tạo

**Nguồn dữ liệu agent được phép truy cập:**

- `user_courses`, `quiz_attempts`
- `training_sessions`, `training_attendance`
- `training_feedback`, `reports`, `analytics_snapshots`
- `data/analytics/*`

**Tool được cấp:**

- `get_training_overview`
- `get_training_progress`
- `get_department_training_analytics`
- `get_training_feedback`
- `analyze_training_feedback`
- `generate_training_report`
- `list_training_reports`
- `get_training_report_detail`

**Output:**

- Tổng quan đào tạo (completion rate, avg score)
- Báo cáo theo phòng ban
- Sentiment feedback có phân tích
- File report PDF/Markdown

**Lưu ý phân quyền:**

- `training_analytics_agent` là agent dành cho HR/Manager
- Không phải mọi user đều được dùng agent này
- Backend phải kiểm tra `user_agent_access` trước khi route sang agent này

---

## 7. Phân quyền và bảo mật

### Nguyên tắc 2 lớp chặn

Một tool call chỉ thành công khi ĐỒng thời:

1. **OpenClaw** cho phép agent dùng tool đó (allowlist trong OpenClaw)
2. **Backend Internal API** xác nhận agent + user + scope hợp lệ

Nếu một trong hai layer không pass → tool call bị từ chối.

### Ai quyết định gì

| Ai                       | Quyết định                                                          |
| ------------------------ | ------------------------------------------------------------------- |
| **Backend**              | User được dùng agent nào, document nào, thao tác gì                 |
| **OpenClaw**             | Agent được gọi tool nào trong phiên này                             |
| **Backend Internal API** | Tool request có hợp lệ không (token, scope, agent, user, ownership) |

### Auth headers chuẩn

**External API (FE → BE):**

```http
Authorization: Bearer <user_access_token>
```

**Internal Tool API (OpenClaw → BE):**

```http
Authorization: Bearer <internal_scoped_token>
X-Agent-Name: onboarding_assistant
X-User-Id: <uuid>
X-Conversation-Id: <uuid>
X-Trace-Id: <trace-id>
```

### Tại sao không cho agent query DB trực tiếp

- **Khó phân quyền chi tiết**: DB không biết agent nào đang gọi với scope gì
- **Khó log**: Không tracking được tool nào gọi gì cho user nào
- **Logic phân tán**: Business logic bị rải rác ra ngoài service layer
- **Rủi ro lộ dữ liệu**: Agent có thể đọc bảng không phải của mình
- **Khó bảo trì**: Thay đổi schema phá vỡ agent code

---

## 8. Cấu trúc tài liệu hệ thống

Mỗi phần của hệ thống cần có tài liệu riêng:

```text
project-root/
  AGENTS.md                       ← file này (tổng thể)
  system-workflow-architecture.md ← workflow chi tiết (reference)

  fe/
    AGENTS.md                     ← quy tắc coding cho FE

  be/
    AGENTS.md                     ← quy tắc coding cho BE
    docs/
      architecture/
        backend-architecture.md
        backend-project-scaffold.md
      api/
        API_SPEC.md
      db/
        project_openclaw_backend_schema_for_agent.md
      plan/
        PLAN.md

  openclaw/
    AGENTS.md                     ← quy tắc coding cho OpenClaw

  data/
    common/
    onboarding/
    training/
    analytics/

  generated/
    context/
    onboarding/
    training/
    analytics/
```

---

## 9. Quy ước API

### External API routes (FE gọi)

```text
POST   /auth/login
POST   /auth/refresh
POST   /auth/logout
GET    /auth/me

POST   /chat/message
GET    /conversations
GET    /conversations/:id/messages

GET    /me/profile
GET    /me/onboarding
GET    /me/checklist
GET    /me/skills
GET    /me/courses
GET    /me/learning-path
GET    /me/training-recommendations

GET    /api/courses
GET    /api/faq
GET    /api/contacts/support
GET    /api/training/analytics/overview
GET    /api/training/reports
POST   /api/training/reports/generate
```

### Internal Tool API routes (OpenClaw gọi)

```text
/internal/tools/onboarding/me/profile
/internal/tools/onboarding/me/onboarding
/internal/tools/onboarding/me/checklist
/internal/tools/onboarding/me/checklist/:taskId/complete
/internal/tools/onboarding/faq
/internal/tools/onboarding/contacts/support

/internal/tools/training/me/skills
/internal/tools/training/me/courses
/internal/tools/training/me/learning-path
/internal/tools/training/me/learning-path/generate
/internal/tools/training/me/training-recommendations
/internal/tools/training/quiz/generate
/internal/tools/training/quiz/submit
/internal/tools/training/quiz/:id/result

/internal/tools/analytics/training/overview
/internal/tools/analytics/training/progress
/internal/tools/analytics/training/department
/internal/tools/analytics/training/course
/internal/tools/analytics/training/feedback
/internal/tools/analytics/training/feedback/analyze
/internal/tools/analytics/training/reports/generate
/internal/tools/analytics/training/reports
/internal/tools/analytics/training/reports/:id
```

### Response format chuẩn

**Success:**

```json
{
  "success": true,
  "data": {},
  "meta": {}
}
```

**Error:**

```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "Bạn không có quyền truy cập tài nguyên này",
    "details": {}
  }
}
```

**Error codes:**

- `UNAUTHORIZED` — token không hợp lệ hoặc hết hạn
- `FORBIDDEN` — không có quyền
- `VALIDATION_ERROR` — request data không hợp lệ
- `NOT_FOUND` — tài nguyên không tồn tại
- `AGENT_ACCESS_DENIED` — user không được dùng agent này
- `TOOL_ACCESS_DENIED` — agent không được dùng tool này
- `OPENCLAW_TIMEOUT` — OpenClaw không phản hồi đúng hạn
- `INTERNAL_ERROR` — lỗi nội bộ không xác định

---

## 10. Quy tắc Observability

Tất cả request quan trọng phải log được:

| Thông tin        | Bắt buộc            |
| ---------------- | ------------------- |
| `traceId`        | ✅                  |
| `userId`         | ✅                  |
| `conversationId` | ✅                  |
| `agentGroup`     | ✅                  |
| `toolName`       | ✅ nếu là tool call |
| `endpoint`       | ✅                  |
| `statusCode`     | ✅                  |
| `duration`       | ✅                  |
| `error`          | ✅ nếu có lỗi       |

**Bắt buộc phải log các sự kiện:**

- Chat request / response
- Agent routing decision
- Tool call request / response / error
- Internal API result
- Permission denied
- Token validation failed
- Report generation
- Quiz submission
- Timeout / retry

**Audit log bắt buộc phải có:**

- `actor` (userId)
- `action` (verb: chat, call_tool, generate_report...)
- `resource` (endpoint, agent, tool, document)
- `timestamp`
- `result` (success/failure)
- `metadata` (conversationId, agentGroup, traceId)

---

## 11. Công nghệ đề xuất cho từng phần

### Backend (`be/`)

- Framework: **NestJS** (TypeScript)
- ORM: **Prisma**
- Database: **PostgreSQL**
- Cache/Queue: **Redis + BullMQ**
- Auth: **JWT** (access + refresh + internal token)
- Validation: **class-validator**

### Frontend (`fe/`)

- Framework theo lựa chọn team
- HTTP client: axios hoặc fetch
- State management: theo framework

### OpenClaw (`openclaw/`)

- Runtime: theo OpenClaw SDK/platform
- Agent: 3 agent lớn, mỗi agent có system prompt + tool allowlist riêng

### Hạ tầng

- Containerization: **Docker + docker-compose**
- Giai đoạn đầu: 3 server (FE+BE, OpenClaw, PostgreSQL+Redis)

---

## 12. Điều không bao giờ được làm

> Đây là danh sách các lỗi kiến trúc nghiêm trọng nhất. Vi phạm bất kỳ điều nào dưới đây là **sai kiến trúc**.

- ❌ Cho FE gọi OpenClaw trực tiếp
- ❌ Cho OpenClaw query DB trực tiếp
- ❌ Dùng token user thật cho OpenClaw
- ❌ Dùng 1 `INTERNAL_AGENT_TOKEN` cố định cho mọi request
- ❌ Mở trần `/internal/tools/*` không có auth
- ❌ Hardcode role check rải rác trong controller
- ❌ Để agent tự suy quyền doanh nghiệp
- ❌ Cấp toàn bộ tool cho một agent
- ❌ Dùng `generated/` files làm source of truth nghiệp vụ
- ❌ Trộn external API route và internal tool API route
- ❌ Cho một agent gọi tool của nhóm nghiệp vụ khác
- ❌ Không có traceId / correlationId trên request quan trọng
- ❌ Không log tool call

---

## 13. Kết luận

> Câu chốt để mọi agent và developer nhớ:

**Backend là cổng xác thực + phân quyền + điều phối. OpenClaw là bộ não AI. Dữ liệu thật nằm ở DB, data folder và backend APIs.**

Hệ thống ổn định khi:

- Không cho user đi thẳng vào OpenClaw
- Không cho agent gọi mọi API
- Không cho agent query DB trực tiếp
- Mọi quyền thật sự phải nằm ở backend
- OpenClaw chỉ được dùng như worker AI có kiểm soát
- Mọi thao tác đều có thể audit và trace

---

_Tài liệu này được cập nhật cùng lúc với `system-workflow-architecture.md` và `be/AGENTS.md`. Khi có thay đổi kiến trúc, phải cập nhật cả 3 tài liệu._
