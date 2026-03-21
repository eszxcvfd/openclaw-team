# Khung dự án Backend
## Dự án: AI Agent Backend dùng OpenClaw

Tài liệu này tạo sẵn bộ khung cho dự án backend. Mục tiêu là để dev có thể bắt đầu code theo cấu trúc thống nhất ngay từ đầu.

---

## 1. Công nghệ đề xuất

- Framework: NestJS
- Language: TypeScript
- ORM: Prisma
- Database: PostgreSQL
- Cache / Queue: Redis + BullMQ
- Validation: class-validator / zod tùy chọn
- Auth: JWT
- API style: REST
- AI integration: OpenClaw client
- Storage:
  - `data/` cho tài liệu gốc
  - `generated/` cho file sinh ra

---

## 2. Cấu trúc thư mục gợi ý

```txt
backend/
├─ src/
│  ├─ main.ts
│  ├─ app.module.ts
│  │
│  ├─ config/
│  │  ├─ env.config.ts
│  │  ├─ app.config.ts
│  │  ├─ db.config.ts
│  │  ├─ redis.config.ts
│  │  └─ openclaw.config.ts
│  │
│  ├─ common/
│  │  ├─ constants/
│  │  ├─ decorators/
│  │  ├─ dto/
│  │  ├─ enums/
│  │  ├─ exceptions/
│  │  ├─ filters/
│  │  ├─ guards/
│  │  ├─ interceptors/
│  │  ├─ interfaces/
│  │  ├─ pipes/
│  │  ├─ types/
│  │  └─ utils/
│  │
│  ├─ modules/
│  │  ├─ auth/
│  │  │  ├─ auth.controller.ts
│  │  │  ├─ auth.service.ts
│  │  │  ├─ auth.module.ts
│  │  │  ├─ dto/
│  │  │  ├─ guards/
│  │  │  └─ strategies/
│  │  │
│  │  ├─ iam/
│  │  │  ├─ users/
│  │  │  ├─ roles/
│  │  │  ├─ permissions/
│  │  │  ├─ user-agent-access/
│  │  │  └─ iam.module.ts
│  │  │
│  │  ├─ chat/
│  │  │  ├─ chat.controller.ts
│  │  │  ├─ chat.service.ts
│  │  │  ├─ conversation.service.ts
│  │  │  ├─ message.service.ts
│  │  │  ├─ chat.module.ts
│  │  │  └─ dto/
│  │  │
│  │  ├─ agent-router/
│  │  │  ├─ agent-router.service.ts
│  │  │  ├─ policies/
│  │  │  ├─ classifiers/
│  │  │  └─ agent-router.module.ts
│  │  │
│  │  ├─ context-builder/
│  │  │  ├─ context-builder.service.ts
│  │  │  ├─ user-context.service.ts
│  │  │  ├─ session-context.service.ts
│  │  │  ├─ document-context.service.ts
│  │  │  └─ context-builder.module.ts
│  │  │
│  │  ├─ tool-gateway/
│  │  │  ├─ tool-gateway.service.ts
│  │  │  ├─ registry/
│  │  │  ├─ tools/
│  │  │  │  ├─ onboarding/
│  │  │  │  ├─ training/
│  │  │  │  └─ analytics/
│  │  │  └─ tool-gateway.module.ts
│  │  │
│  │  ├─ openclaw/
│  │  │  ├─ openclaw.client.ts
│  │  │  ├─ openclaw.service.ts
│  │  │  ├─ dto/
│  │  │  └─ openclaw.module.ts
│  │  │
│  │  ├─ onboarding/
│  │  │  ├─ onboarding.controller.ts
│  │  │  ├─ onboarding.service.ts
│  │  │  ├─ onboarding.module.ts
│  │  │  ├─ faq.service.ts
│  │  │  ├─ checklist.service.ts
│  │  │  └─ dto/
│  │  │
│  │  ├─ training/
│  │  │  ├─ training.controller.ts
│  │  │  ├─ training.service.ts
│  │  │  ├─ learning-path.service.ts
│  │  │  ├─ quiz.service.ts
│  │  │  ├─ recommendation.service.ts
│  │  │  ├─ training.module.ts
│  │  │  └─ dto/
│  │  │
│  │  ├─ analytics/
│  │  │  ├─ analytics.controller.ts
│  │  │  ├─ analytics.service.ts
│  │  │  ├─ feedback.service.ts
│  │  │  ├─ reports.service.ts
│  │  │  ├─ snapshot.service.ts
│  │  │  ├─ analytics.module.ts
│  │  │  └─ dto/
│  │  │
│  │  ├─ documents/
│  │  │  ├─ documents.service.ts
│  │  │  ├─ documents.module.ts
│  │  │  └─ dto/
│  │  │
│  │  ├─ jobs/
│  │  │  ├─ jobs.module.ts
│  │  │  ├─ processors/
│  │  │  ├─ queues/
│  │  │  └─ schedulers/
│  │  │
│  │  └─ health/
│  │     ├─ health.controller.ts
│  │     ├─ health.service.ts
│  │     └─ health.module.ts
│  │
│  ├─ infra/
│  │  ├─ prisma/
│  │  │  ├─ prisma.module.ts
│  │  │  └─ prisma.service.ts
│  │  ├─ redis/
│  │  │  ├─ redis.module.ts
│  │  │  └─ redis.service.ts
│  │  ├─ logger/
│  │  └─ storage/
│  │
│  └─ tests/
│     ├─ unit/
│     ├─ integration/
│     └─ e2e/
│
├─ prisma/
│  ├─ schema.prisma
│  ├─ migrations/
│  └─ seed/
│
├─ data/
│  ├─ common/
│  ├─ onboarding/
│  ├─ training/
│  └─ analytics/
│
├─ generated/
│  ├─ context/
│  ├─ onboarding/
│  ├─ training/
│  └─ analytics/
│
├─ docs/
│  ├─ architecture/
│  ├─ api/
│  ├─ db/
│  ├─ runbooks/
│  └─ decisions/
│
├─ .env
├─ .env.example
├─ package.json
├─ tsconfig.json
├─ nest-cli.json
├─ docker-compose.yml
└─ Dockerfile
```

---

## 3. Nguyên tắc chia module

### 3.1 Core modules
Bao gồm:
- auth
- iam
- chat
- agent-router
- context-builder
- tool-gateway
- openclaw

Đây là phần sống còn của hệ thống.

### 3.2 Business modules
Bao gồm:
- onboarding
- training
- analytics
- documents

Đây là phần nghiệp vụ.

### 3.3 Infra modules
Bao gồm:
- prisma
- redis
- logger
- storage
- jobs

Đây là phần hạ tầng.

---

## 4. Trách nhiệm từng module

### auth
- đăng nhập
- logout
- refresh token
- validate JWT
- guard xác thực

### iam
- users
- roles
- permissions
- role_permissions
- user_roles
- user_agent_access

### chat
- conversations
- messages
- session info
- transcript metadata

### agent-router
- xác định nên gọi agent nào
- kiểm tra quyền user với agent
- phân loại intent cơ bản

### context-builder
- lấy user profile
- lấy quyền
- lấy document list được phép dùng
- sinh USER.md
- sinh session-context.md

### tool-gateway
- đăng ký tool
- map tool vào service nội bộ
- kiểm tra tool access theo agent
- chuẩn hóa kết quả trả ra cho OpenClaw

### openclaw
- client gọi OpenClaw
- đóng gói request
- nhận response
- xử lý timeout / retry / logging

### onboarding
- onboarding plan
- onboarding task
- faq
- policy onboarding
- support contacts

### training
- skills
- courses
- learning path
- quiz
- recommendation

### analytics
- progress
- feedback
- report
- KPI snapshot

### documents
- metadata tài liệu
- file path
- version
- permission theo role

### jobs
- background processors
- queue jobs
- cron jobs

---

## 5. Quy ước luồng chat

Luồng chat chuẩn trong code:

1. `ChatController` nhận message
2. `AuthGuard` xác thực user
3. `ChatService` tạo / lấy conversation
4. `AgentRouterService` chọn agent phù hợp
5. `ContextBuilderService` build context
6. `OpenClawService` gửi request
7. nếu OpenClaw gọi tool:
   - `ToolGatewayService` nhận tool call
   - gọi đúng domain service tương ứng
8. nhận final answer
9. lưu messages
10. trả response ra frontend

---

## 6. Quy ước tool

Mỗi tool nên có:
- tên tool
- mô tả rõ
- schema input
- schema output
- agent nào được dùng
- service nào xử lý

Ví dụ đặt file:

```txt
src/modules/tool-gateway/tools/onboarding/get-my-checklist.tool.ts
src/modules/tool-gateway/tools/training/get-my-courses.tool.ts
src/modules/tool-gateway/tools/analytics/generate-training-report.tool.ts
```

Mỗi tool nên map tới một service nội bộ, ví dụ:
- `ChecklistService`
- `RecommendationService`
- `ReportsService`

Không cho tool query DB trực tiếp nếu muốn giữ code sạch.
Tool nên gọi qua service layer.

---

## 7. Quy ước context file

### USER.md
Dùng để mô tả người dùng hiện tại cho agent.

Ví dụ nội dung:
- user id
- tên
- phòng ban
- vị trí
- role
- nhóm agent được phép dùng
- trạng thái onboarding
- các khóa học hiện tại

### session-context.md
Dùng để mô tả phiên chat hiện tại:
- session id
- agent hiện tại
- tài nguyên được phép dùng
- mục tiêu hiện tại của phiên chat

### allowed-resources.json
Danh sách giới hạn tài nguyên:
- APIs
- document ids
- group code
- tool names

---

## 8. Quy ước API

### Public API
Frontend được gọi:
- auth
- chat
- profile
- dashboard
- user-facing endpoints

### Internal API / tool-facing API
OpenClaw tool gọi:
- onboarding APIs
- training APIs
- analytics APIs

Khuyến nghị:
- tách route namespace rõ
- ví dụ `/internal/tools/...`
- hoặc vẫn dùng service nội bộ nếu tool chạy trong cùng app

---

## 9. Quy ước bảo mật

- user không gọi OpenClaw trực tiếp
- OpenClaw không chạm DB trực tiếp
- tool không được gọi mọi service
- mỗi agent có allowlist tool riêng
- backend phải check quyền lại ở mỗi internal API
- log lại toàn bộ tool call quan trọng
- dùng internal token riêng cho OpenClaw/tool call
- không dùng chung token public user với internal agent token

---

## 10. Quy ước database

### Nhóm IAM
- users
- roles
- permissions
- role_permissions
- user_roles
- user_agent_access

### Nhóm chat
- conversations
- messages

### Nhóm documents
- documents
- document_permissions

### Nhóm onboarding
- onboarding_plans
- onboarding_tasks
- user_onboarding_tasks
- faq_items
- contacts_directory
- company_policies

### Nhóm training
- skills
- user_skills
- role_skill_requirements
- courses
- course_skills
- course_prerequisites
- user_courses
- learning_paths
- learning_path_items
- quiz_templates
- quiz_questions
- quiz_attempts

### Nhóm analytics
- training_feedback
- training_sessions
- training_attendance
- reports
- analytics_snapshots

---

## 11. Quy ước tài liệu trong `data/`

```txt
data/
├─ common/
│  ├─ company-overview.md
│  ├─ org-structure.md
│  ├─ policies-overview.md
│  └─ glossary.md
├─ onboarding/
│  ├─ employee-handbook.md
│  ├─ company-policies.md
│  ├─ first-day-guide.md
│  ├─ checklist-template.md
│  ├─ faq.md
│  ├─ tools-guide.md
│  └─ support-contacts.md
├─ training/
│  ├─ course-catalog.md
│  ├─ skill-matrix.md
│  ├─ learning-paths.md
│  ├─ quiz-rules.md
│  ├─ evaluation-rubric.md
│  └─ course-content/
└─ analytics/
   ├─ report-template.md
   ├─ kpi-rules.md
   ├─ sentiment-rules.md
   └─ dashboard-metrics.md
```

---

## 12. Quy ước file sinh trong `generated/`

```txt
generated/
├─ context/
│  ├─ users/{user_id}/USER.md
│  └─ sessions/{session_id}/session-context.md
├─ onboarding/
│  └─ {user_id}/
├─ training/
│  └─ {user_id}/
└─ analytics/
   └─ reports/
```

---

## 13. Biến môi trường gợi ý

File `.env.example`

```env
NODE_ENV=development
PORT=3000

DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ai_agent_backend
REDIS_URL=redis://localhost:6379

JWT_ACCESS_SECRET=change_me
JWT_REFRESH_SECRET=change_me

OPENCLAW_BASE_URL=http://openclaw:8080
OPENCLAW_API_KEY=change_me

INTERNAL_AGENT_TOKEN=change_me

DATA_DIR=./data
GENERATED_DIR=./generated
LOG_LEVEL=debug
```

---

## 14. Docker Compose gợi ý

```yaml
version: "3.9"

services:
  backend:
    build: .
    container_name: ai-agent-backend
    ports:
      - "3000:3000"
    env_file:
      - .env
    depends_on:
      - postgres
      - redis

  postgres:
    image: postgres:16
    container_name: ai-agent-postgres
    environment:
      POSTGRES_DB: ai_agent_backend
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7
    container_name: ai-agent-redis
    ports:
      - "6379:6379"

volumes:
  postgres_data:
```

---

## 15. Danh sách file nên tạo đầu tiên

### App bootstrap
- `src/main.ts`
- `src/app.module.ts`

### Config
- `src/config/env.config.ts`
- `src/config/db.config.ts`
- `src/config/openclaw.config.ts`

### Infra
- `src/infra/prisma/prisma.service.ts`
- `src/infra/prisma/prisma.module.ts`
- `src/infra/redis/redis.service.ts`

### Core
- `src/modules/auth/auth.module.ts`
- `src/modules/iam/iam.module.ts`
- `src/modules/chat/chat.module.ts`
- `src/modules/agent-router/agent-router.module.ts`
- `src/modules/context-builder/context-builder.module.ts`
- `src/modules/tool-gateway/tool-gateway.module.ts`
- `src/modules/openclaw/openclaw.module.ts`

### Business
- `src/modules/onboarding/onboarding.module.ts`
- `src/modules/training/training.module.ts`
- `src/modules/analytics/analytics.module.ts`

### Health
- `src/modules/health/health.controller.ts`

---

## 16. Roadmap code giai đoạn đầu

### Phase 1
- auth
- iam
- chat cơ bản
- onboarding module
- openclaw client
- tool gateway cơ bản
- 1 luồng chat onboarding end-to-end

### Phase 2
- training module
- learning path
- quiz
- generated context files

### Phase 3
- analytics module
- reports
- snapshots
- background jobs
- audit log đầy đủ

---

## 17. Định nghĩa thành công tối thiểu

MVP được xem là đạt khi:

- user đăng nhập được
- backend route đúng nhóm agent
- OpenClaw nhận request và trả lời được
- ít nhất 1 tool onboarding gọi được backend service
- có lưu conversation/message
- có kiểm tra quyền theo user/agent
- có tạo được USER.md hoặc session-context.md

---

## 18. Kết luận

Khung dự án này được thiết kế để:

- dễ bắt đầu code
- dễ chia việc cho team
- dễ mở rộng sau này
- phù hợp với mô hình backend điều phối OpenClaw
- không bị rối ngay từ giai đoạn đầu
