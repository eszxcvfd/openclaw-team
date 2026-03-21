# OpenClaw Backend

Backend điều phối AI Agent cho hệ thống **OpenClaw** — nền tảng hỗ trợ Onboarding, Learning & Training nội bộ doanh nghiệp.

---

## Mục lục

- [Tổng quan](#tổng-quan)
- [Kiến trúc](#kiến-trúc)
- [Tech Stack](#tech-stack)
- [Cấu trúc dự án](#cấu-trúc-dự-án)
- [Modules](#modules)
- [Cơ sở dữ liệu](#cơ-sở-dữ-liệu)
- [Cài đặt & Chạy local](#cài-đặt--chạy-local)
- [Environment Variables](#environment-variables)
- [Scripts](#scripts)
- [API Overview](#api-overview)
- [Tài liệu nội bộ](#tài-liệu-nội-bộ)

---

## Tổng quan

Backend này đóng vai trò **trung tâm điều phối** toàn bộ hệ thống. Nó không chỉ là một API server thông thường mà còn:

- Xác thực & phân quyền người dùng (Auth + RBAC)
- Điều phối AI Agent thông qua OpenClaw
- Xây dựng context cho từng phiên làm việc của agent
- Cung cấp API nội bộ để agent gọi qua Tool Gateway
- Ghi log hội thoại, audit trail và tool call
- Quản lý dữ liệu nghiệp vụ: Onboarding, Training, Analytics

**Kiến trúc:** Modular Monolith + AI Orchestrator + Tool/API Layer

---

## Kiến trúc

```
Frontend (Web Chat / Dashboard)
        │
        ▼
  ┌─────────────────────────────────────┐
  │           Backend (NestJS)          │
  │  Auth → RBAC → Agent Router         │
  │  Context Builder → OpenClaw Client  │
  │  Tool Gateway ← API nội bộ          │
  │  Business Modules (Onboarding,      │
  │   Training, Analytics, Documents)   │
  └──────────────┬──────────────────────┘
                 │
     ┌───────────┴────────────┐
     ▼                        ▼
  OpenClaw                PostgreSQL
 (AI Engine)               + Redis
```

**Luồng chuẩn:**

1. User chat từ frontend → Backend xác thực user & kiểm tra quyền
2. Backend chọn agent phù hợp & xây dựng context
3. Backend gửi request sang OpenClaw
4. OpenClaw agent xử lý, gọi tool khi cần
5. Tool gọi API nội bộ Backend → Backend query DB → trả kết quả
6. OpenClaw trả lại final answer → Backend lưu log / conversation → trả về Frontend

---

## Tech Stack

| Thành phần      | Công nghệ                         |
| --------------- | --------------------------------- |
| Framework       | NestJS 11 (TypeScript)            |
| ORM             | Prisma 7                          |
| Database        | PostgreSQL (Supabase)             |
| Cache / Queue   | Redis                             |
| AI Engine       | OpenClaw (external service)       |
| HTTP Security   | Helmet, CORS                      |
| Validation      | class-validator, class-transformer |
| Config          | @nestjs/config + dotenv           |

---

## Cấu trúc dự án

```
be/
├── src/
│   ├── main.ts                  # Entry point, cấu hình global pipes & middleware
│   ├── app.module.ts            # Root module, import toàn bộ module
│   ├── config/                  # Cấu hình app, db, redis, openclaw
│   ├── common/                  # Shared utilities, guards, decorators, pipes, filters
│   │   ├── constants/
│   │   ├── decorators/
│   │   ├── dto/
│   │   ├── enums/
│   │   ├── exceptions/
│   │   ├── filters/
│   │   ├── guards/
│   │   ├── interceptors/
│   │   ├── interfaces/
│   │   ├── pipes/
│   │   ├── types/
│   │   └── utils/
│   ├── infra/                   # Infrastructure layer
│   │   ├── prisma/              # PrismaModule & PrismaService
│   │   ├── redis/               # RedisModule
│   │   ├── logger/              # Logger module
│   │   └── storage/             # File storage
│   └── modules/                 # Business & system modules
│       ├── auth/
│       ├── iam/
│       ├── chat/
│       ├── agent-router/
│       ├── context-builder/
│       ├── tool-gateway/
│       ├── openclaw/
│       ├── onboarding/
│       ├── training/
│       ├── analytics/
│       ├── documents/
│       ├── jobs/
│       └── health/
├── prisma/
│   ├── schema.prisma            # Toàn bộ schema DB
│   ├── migrations/              # Prisma migrations
│   └── seed/                    # Seed data
├── data/                        # Tài liệu tĩnh (handbook, policy, FAQ...)
├── generated/                   # File context & artifact được sinh ra bởi agent
├── docs/
│   ├── architecture/            # Tài liệu kiến trúc backend
│   ├── api/                     # Tài liệu API
│   ├── db/                      # Tài liệu database
│   ├── decisions/               # Architecture Decision Records (ADR)
│   └── runbooks/                # Runbooks vận hành
├── .env.example                 # Mẫu biến môi trường
├── package.json
├── tsconfig.json
└── nest-cli.json
```

---

## Modules

### System Modules

| Module            | Chức năng                                                                 |
| ----------------- | ------------------------------------------------------------------------- |
| `auth`            | Login, logout, refresh token, session validation                          |
| `iam`             | Users, roles, permissions, user_roles, role_permissions, user_agent_access |
| `health`          | Health check endpoint                                                     |

### AI Orchestration Modules

| Module            | Chức năng                                                                 |
| ----------------- | ------------------------------------------------------------------------- |
| `agent-router`    | Route request tới đúng nhóm agent, kiểm tra quyền truy cập agent         |
| `context-builder` | Xây dựng USER.md, session-context từ DB và tài liệu tĩnh                 |
| `tool-gateway`    | Quản lý & expose API nội bộ để agent gọi qua tool                        |
| `openclaw`        | Client giao tiếp với OpenClaw engine (gửi/nhận request, xử lý tool call) |

### Business Modules

| Module        | Chức năng                                                                              |
| ------------- | -------------------------------------------------------------------------------------- |
| `chat`        | Conversations, messages, session metadata, transcript log                             |
| `onboarding`  | Onboarding plans, tasks, FAQ, contacts, policies                                      |
| `training`    | Skills, courses, learning paths, quiz templates & attempts, training sessions         |
| `analytics`   | Training feedback, progress tracking, analytics snapshots, reports                    |
| `documents`   | Document metadata, permissions, versioning                                             |
| `jobs`        | Background jobs: generate reports, analyze feedback, rebuild context, nightly snapshots |

---

## Cơ sở dữ liệu

Dự án sử dụng **PostgreSQL** (hosted trên Supabase) với Prisma làm ORM.

### Nhóm bảng chính

**IAM & Auth**
- `users`, `roles`, `permissions`, `user_roles`, `role_permissions`
- `auth_sessions`, `service_tokens`, `user_agent_access`

**AI Orchestration**
- `agent_groups`, `agent_submodules`, `agent_group_tools`
- `tools`, `backend_api_catalog`, `tool_call_logs`
- `conversations`, `messages`, `session_contexts`, `user_contexts`
- `generated_artifacts`

**Onboarding**
- `onboarding_plans`, `onboarding_tasks`, `user_onboarding_tasks`
- `faq_items`, `contacts_directory`, `company_policies`

**Training**
- `skills`, `courses`, `course_skills`, `course_prerequisites`
- `learning_paths`, `learning_path_items`, `user_learning_paths`
- `quiz_templates`, `quiz_questions`, `quiz_attempts`
- `training_sessions`, `training_attendance`, `training_feedback`
- `user_courses`, `user_skills`, `role_skill_requirements`

**Analytics & Documents**
- `analytics_snapshots`, `reports`
- `documents`, `document_permissions`

**Organization**
- `departments`, `positions`

---

## Cài đặt & Chạy local

### Yêu cầu

- Node.js >= 20
- npm >= 10
- PostgreSQL (hoặc Supabase project)
- Redis (local hoặc cloud)

### Bước 1: Clone & cài dependencies

```bash
git clone <repo-url>
cd be
npm install
```

### Bước 2: Cấu hình environment

```bash
cp .env.example .env
# Chỉnh sửa .env với thông tin thực tế
```

### Bước 3: Setup database

**Nếu dùng Supabase (khuyến nghị):**

```bash
# Chạy SQL schema lên Supabase, pull schema về, và generate Prisma Client
npm run prisma:setup:supabase
```

**Nếu dùng PostgreSQL local:**

```bash
npm run prisma:migrate:deploy
npm run prisma:generate
```

### Bước 4: Chạy development server

```bash
npm run dev
```

Server sẽ chạy tại: `http://localhost:3001`

---

## Environment Variables

Tham khảo file `.env.example`. Các biến cần thiết:

```env
# PostgreSQL (Supabase)
DATABASE_URL="postgresql://postgres:<password>@db.<project>.supabase.co:5432/postgres?sslmode=no-verify"

# Redis
REDIS_URL="redis://localhost:6379"

# OpenClaw Engine
OPENCLAW_BASE_URL="http://localhost:8000"
OPENCLAW_API_KEY="your-openclaw-api-key"

# App
PORT=3001
```

---

## Scripts

| Script                       | Mô tả                                                                      |
| ---------------------------- | -------------------------------------------------------------------------- |
| `npm run dev`                | Chạy development server với watch mode                                     |
| `npm run start:debug`        | Chạy với debug mode                                                        |
| `npm run build`              | Build production bundle                                                    |
| `npm run start:prod`         | Chạy production server                                                     |
| `npm run prisma:generate`    | Generate Prisma Client từ schema                                           |
| `npm run prisma:db:pull`     | Pull schema từ DB về (sync schema.prisma)                                  |
| `npm run prisma:db:execute`  | Chạy file SQL lên DB                                                       |
| `npm run prisma:setup:supabase` | Full setup Supabase: execute SQL → pull → generate                      |
| `npm run prisma:migrate:deploy` | Deploy pending migrations                                               |
| `npm run prisma:migrate:status` | Kiểm tra trạng thái migrations                                          |

---

## API Overview

Tất cả API có prefix `/api`.

### Onboarding

| Method | Endpoint                           | Mô tả                          |
| ------ | ---------------------------------- | ------------------------------ |
| GET    | `/api/me/profile`                  | Lấy thông tin profile user     |
| GET    | `/api/me/onboarding`               | Lấy kế hoạch onboarding        |
| GET    | `/api/me/checklist`                | Lấy checklist onboarding       |
| POST   | `/api/me/checklist/:taskId/complete` | Đánh dấu hoàn thành task     |
| GET    | `/api/policies?category=onboarding` | Lấy policy theo category      |
| GET    | `/api/faq?category=onboarding`     | Lấy FAQ theo category          |
| GET    | `/api/contacts/support`            | Lấy danh sách liên hệ hỗ trợ  |

### Learning & Training

| Method | Endpoint                          | Mô tả                            |
| ------ | --------------------------------- | -------------------------------- |
| GET    | `/api/me/skills`                  | Kỹ năng hiện tại của user        |
| GET    | `/api/me/courses`                 | Các khóa học đã đăng ký          |
| GET    | `/api/me/learning-path`           | Lộ trình học hiện tại            |
| POST   | `/api/me/learning-path/generate`  | Sinh lộ trình học mới            |
| GET    | `/api/courses`                    | Danh sách khóa học               |
| GET    | `/api/courses/:id`                | Chi tiết khóa học                |
| GET    | `/api/me/training-recommendations` | Gợi ý đào tạo                   |
| POST   | `/api/quiz/generate`              | Sinh quiz                        |
| POST   | `/api/quiz/submit`                | Nộp bài quiz                     |
| GET    | `/api/quiz/:id/result`            | Kết quả quiz                     |

### Analytics

| Method | Endpoint                               | Mô tả                         |
| ------ | -------------------------------------- | ----------------------------- |
| GET    | `/api/training/analytics/overview`     | Tổng quan đào tạo             |
| GET    | `/api/training/analytics/progress`     | Tiến độ đào tạo               |
| GET    | `/api/training/analytics/department`   | Analytics theo phòng ban      |
| GET    | `/api/training/analytics/course`       | Analytics theo khóa học       |
| GET    | `/api/training/feedback`               | Danh sách feedback            |
| POST   | `/api/training/feedback/analyze`       | Phân tích feedback            |
| POST   | `/api/training/reports/generate`       | Sinh báo cáo đào tạo          |
| GET    | `/api/training/reports`                | Danh sách báo cáo             |
| GET    | `/api/training/reports/:id`            | Chi tiết báo cáo              |

---

## Tài liệu nội bộ

| Tài liệu                                                         | Nội dung                                    |
| ---------------------------------------------------------------- | ------------------------------------------- |
| [Backend Architecture](./docs/architecture/backend-architecture.md) | Kiến trúc tổng thể, module, luồng xử lý |
| [Backend Scaffold](./docs/architecture/backend-project-scaffold.md) | Cấu trúc project & scaffold guide        |

---

## Nguyên tắc quan trọng

- **User không bao giờ gọi thẳng OpenClaw** — mọi request đi qua Backend
- **Agent không gọi DB trực tiếp** — agent gọi Tool → Tool gọi API Backend → Backend query DB
- **Mỗi agent chỉ có quyền dùng tool trong phạm vi nghiệp vụ của mình**
- **Backend API vẫn phải xác thực quyền độc lập**, bất kể agent nào đang gọi
- **Dữ liệu tĩnh** (handbook, policy) → `data/` | **Dữ liệu thật** → DB | **Context & artifact tạm** → `generated/`
