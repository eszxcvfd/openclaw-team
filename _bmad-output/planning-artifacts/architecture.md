---
stepsCompleted:
  - 1
  - 2
  - 3
  - 4
  - 5
  - 6
  - 7
  - 8
workflowType: 'architecture'
lastStep: 8
status: 'complete'
completedAt: '2026-03-22T12:59:00+07:00'
inputDocuments:
  - d:\openclaw-team\_bmad-output\planning-artifacts\prd.md
  - d:\openclaw-team\PLAN.md
  - d:\openclaw-team\AGENTS.md
workflowType: 'architecture'
project_name: 'openclaw-team'
user_name: 'Giang'
date: '2026-03-22'
---

# Architecture Decision Document

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

## Project Context Analysis

### Requirements Overview

**Functional Requirements:**
Hệ thống xoay quanh 15 Yêu cầu Chức năng (FRs). Về mặt kiến trúc, điều này cấu thành hệ thống 2 phân vùng (zones) rõ rệt: Phân vùng Dữ liệu kiểm soát quyền (Backend/DB) và Phân vùng Suy luận (OpenClaw AI Engine). Backend đóng vai trò làm điểm chốt bảo mật (Control Plane), liên tục chặn, phân tích Context, sinh `internal_scoped_token` và bắt HTTP responses/tool calls từ AI Agent.

**Non-Functional Requirements:**
7 NFRs đặc biệt định hình cấu trúc kỹ thuật:
- **Performance:** Áp dụng cơ chế Streaming (Server-Sent Events) để đáp ứng Time-to-First-Token (TTFT) < 3s, xử lý rào cản trễ (latency hops) khi kết nối vòng lặp `FE -> BE -> OpenClaw -> BE -> OpenClaw -> BE -> FE`.
- **Security:** Mã hóa Token nội bộ siêu ngắn hạn (TTL < 5 phút) theo từng phiên làm việc (conversationId) và trói buộc quyền cấp độ API endpoint.
- **Maintainability:** Truy vết phân tán (Distributed Tracing) bằng biến `traceId` đi xuyên qua FrontEnd, Backend và OpenClaw để lưu Audit Log trọn vẹn (Append-only).

**Scale & Complexity:**
- Primary domain: Web Full-stack & AI Orchestration System.
- Complexity level: High (Kiến trúc Zero-Trust Sandbox).
- Estimated architectural components: 5 cụm lõi (Frontend SPA, Backend API Gateway/Control Plane, OpenClaw AI Engine, RDBMS, Redis/BullMQ).

### Technical Constraints & Dependencies
- Ràng buộc lõi (Zero-Trust): LLM hoàn toàn bị cách ly với cơ sở dữ liệu. Mọi liên kết từ AI vào DB bắt buộc lội ngược dòng qua các REST APIs của Backend thông qua một tập "Tools" nội bộ được định nghĩa tước.
- Phụ thuộc Công nghệ đã chốt theo kế hoạch (PLAN.md): React/Vite cho giao diện, NestJS/Prisma cho Backend Core, PostgreSQL 16 cho DB chính, BullMQ cho Background Jobs.

### Cross-Cutting Concerns Identified
- **Authentication & Authorization Guardrails:** Cấu trúc tầng Middleware/Guards để kiểm duyệt `internal_scoped_token` đối với các tool calls.
- **Observability (Giám sát & Lưu vết):** Thiết lập hệ thống Audit Logs kiên cố (Append-only) để chứng minh tính hợp lệ quy trình AI.
- **Network Resilience:** Kịch bản ứng phó sự cố đường truyền tĩnh và động trong môi trường microservices giao tiếp đa lớp (Timeout policies & Max retries).

## Starter Template Evaluation

### Primary Technology Domain
Theo phân tích bối cảnh (Project Context), OpenClaw là một nền tảng doanh nghiệp (Enterprise Platform). Dựa trên chỉ định kỹ thuật:
- Hệ sinh thái cốt lõi: **TypeScript / Node.js**
- Cấu trúc: Tách biệt hoàn toàn Frontend (Web App) và Backend (API Control Plane).

### Starter Options Considered

**1. Phân vùng Frontend (Web Application SPA):**
Các tiêu chí: Tốc độ thiết kế (DX) nhanh, đáp ứng UI tương tác chat realtime, *không cần SEO* (vì đây là App nội bộ công ty).
- *Lựa chọn 1 (Loại): Next.js* – Framework mạnh nhưng đi kèm tư duy Server-Side Rendering (SSR), dư thừa với một hệ sinh thái SPA internal như OpenClaw, làm cấu hình cồng kềnh quá mức cần thiết.
- *Lựa chọn 2 (Chọn): Vite React TypeScript* – Chuẩn công nghiệp hiện tại cho SPA. Tốc độ hot-reload cực nhanh nhờ esbuild, cấu hình mỏng, dễ dàng tích hợp UI Libs (Tailwind, Radix Component).

**2. Phân vùng Backend (API Control Plane):**
Các tiêu chí: Bảo mật, Code OOP chặt chẽ, dễ module-hóa các nhóm chức năng (Auth, Chat, IAM).
- *Lựa chọn (Chọn): NestJS* – Framework Node.js đẳng cấp Enterprise. Cung cấp sẵn cơ chế Inject (Dependency Injection), Middleware, Decorator (rất mạnh để bắt quyền IAM/RBAC). Tương thích hoàn hảo với cấu trúc micro/module-based, phù hợp chia 3 cụm Agent chuyên biệt.

### Selected Starters: Vite (FE) & NestJS (BE)

**Rationale (Lý do chọn):** 
Sự kết hợp giữa Vite (cho tốc độ hiển thị FrontEnd mượt mà) và NestJS (cho lớp giáp bảo mật, phân quyền Backend khắt khe) là cặp bài trùng hoàn hảo nhất cho một dự án cần độ an toàn nội bộ cao (Data Privacy) và mở rộng logic phức tạp ở phía sau.

**Initialization Commands:**

Khởi tạo Frontend (`fe/`):
```bash
npm create vite@latest fe -- --template react-ts
```

Khởi tạo Backend khắt khe kiểu tĩnh (`be/`):
```bash
npx @nestjs/cli new be --strict --package-manager npm
```

**Architectural Decisions Provided by Starters:**

- **Language & Runtime:** 100% TypeScript Strict Mode cho cả 2 hệ thống. Tránh triệt để lỗi kiểu động (any) dẫn tới sai sót luồng dữ liệu khi kết nối AI.
- **Styling Solution (Frontend):** Vite không áp đặt, ta sẽ gỡ giao diện mặc định để ráp TailwindCSS + chuẩn UX riêng trong các bước tới.
- **Build Tooling:** Backend tích hợp sẵn TypeScript compiler chuẩn xác. Frontend ứng dụng esbuild (Dev) & Rollup (Production).
- **Testing Framework:** Backend tích hợp sẵn Jest framework (Unit/e2e tests).
- **Code Organization:**
  - Khối `be/` tuân thủ tuyệt đối chuẩn Module-Controller-Service-Repository của NestJS.
  - Khối `fe/` tuân thủ chuẩn Component-based (Pages/Components/Hooks) của React.
- **Development Experience:** Nest CLI cung cấp lệnh tạo boilerplate (`nest g resource`) giúp team code cực kì chuẩn mực và nhanh chóng. FE có Hot Module Replacement cực tốt từ Vite.

**Note:** Các lệnh tạo project khung này sẽ được chuyển thành các User Story triển khai đầu tiên (Implementation Story) của Sprint.

## Core Architectural Decisions

### Decision Priority Analysis

**Critical Decisions (Block Implementation):**
- Data Caching Strategy: Cấu hình lưu trữ bộ nhớ tạm (Session Context) qua Redis Cluster, thay vì truy xuất toàn bộ trên DB gốc (PostgreSQL) để đáp ứng chuẩn AI Tokens Response Time (TTFT).
- AI Response Streaming: Server-Sent Events (SSE). Bắt buộc để giảm độ trễ (latency) khi LLM generate nội dung, cho phép Client nhận chữ theo luồng (stream) tức thì.

**Important Decisions (Shape Architecture):**
- Backend Rate Limiting Strategy: Giới hạn tần suất gọi AI theo `userId` thực tế trên ngăn xếp Redis thay vì IP để bảo vệ hạn ngạch Token không bị sập nhầm ở nội bộ IP văn phòng.
- Frontend State Management: Sử dụng Zustand đồng bộ hóa local state siêu nhẹ kết hợp chặt chẽ cùng TanStack Query (React Query v5) phục trách layer gọi và cache APIs.
- CSS Framework & UI: Ứng dụng Tailwind CSS v4 mới nhất cùng Shadcn UI để nhanh chóng xây dựng hệ thống Component tái sử dụng cao.

**Deferred Decisions (Post-MVP):**
- Xây dựng kho dữ liệu phân tích khối lượng lớn phục vụ Agent Training Analytics (Phase 2 & 3).

### Data Architecture

- **Primary Database:** PostgreSQL 16 (Source of Truth chuyên lưu trữ Roles, Users, Permissions, Tools logs). Sử dụng Prisma ORM kết nối Typescript.
- **In-Memory Store:** Redis Cluster (Backing store cho BullMQ Background Jobs & Session Context caching).

### Authentication & Security

- **User Authentication:** HTTP JWT Token phân quyền cơ bản qua Web Login.
- **AI Internal Security:** Backend cấp phát `internal_scoped_token` (JWT có TTL cực ngắn < 5 phút, bao gói giới hạn quyền Scopes) được mã hóa. Mọi action lấy dữ liệu từ OpenClaw phải đi qua các Role Guards để giải mã.
- **API Defense (Rate Limiter):** Sử dụng gói công cụ `@nestjs/throttler` (v6.5+) trên các Controller AI xử lý hội thoại.

### API & Communication Patterns

- **API Interface Standard:** REST JSON API được tích hợp DTO Validation chặn payload rác.
- **AI Streaming Interface:** Chuẩn SSE (header payload: `text/event-stream`). Giải pháp gửi message 1 chiều (Unidirectional) không yêu cầu kết nối nặng nề như WebSockets, rất phù hợp vượt giao thức Web/Proxy bảo mật doanh nghiệp.

### Frontend Architecture

- **State Management:** Zustand (v5.x) & TanStack Query (v5.x).
- **Styling Solution:** Tailwind CSS v4 & Radix / Shadcn UI primitives.
- **Routing:** React Router.

### Decision Impact Analysis

**Implementation Sequence:**
1. Khởi tạo 2 repo rỗng Frontend (Vite) & Backend (NestJS).
2. Nạp cấu trúc Prisma Schema, Setup Auth cơ bản.
3. Tích hợp Redis, BullMQ và Global Throttler.
4. Viết Endpoint Chat Streaming dựa trên SSE Pattern.
5. Code FrontEnd UI kết nối SSE Parser và Zustand Store.

**Cross-Component Dependencies:**
- Lựa chọn SSE ở Backend đòi hỏi Frontend phải thay thế fetch/axios thuần bằng `EventSource` API (hoặc open-source HTTP fetch-event-source) để đọc và chia luồng dạng stream bytes liên tục.
- Việc cache Redis ngắn hạn buộc AI hy sinh bối cảnh nếu lịch sử vượt quá một khối (ví dụ chỉ nhớ 20 vòng đàm thoại trước đó). Tuy nhiên việc này tiết kiệm cực kì nhiều chi phí token context window.

## Implementation Patterns & Consistency Rules

### Naming Patterns

**Database Naming Conventions (Prisma):**
- **Model Names:** Bắt buộc dùng `PascalCase` dạng số ít (VD: `model User`, `model OnboardingTask`). 
- **DB Table Names:** Bắt buộc dùng `@@map('snake_case_plural')` để ép tên bảng dưới DB thành chuẩn `users`, `onboarding_tasks`.
- **Column Names:** Dùng `camelCase` trong model TypeScript và dùng `@map('snake_case')` để lưu ánh xạ Data Column (VD: `createdAt DateTime @map("created_at")`).

**API Naming Conventions:**
- **Client REST APIs:** Luôn sử dụng danh từ số nhiều đi kèm gạch ngang `kebab-case` (VD: `GET /api/onboarding-tasks`).
- **Agent Internal APIs:** Tuân thủ Namespace đã quy định trong file hệ thống `AGENTS.md` (VD: `GET /internal/tools/onboarding/me/profile`).

**Code Naming Conventions:**
- **Frontend Components:** Tên File và Function Component dùng `PascalCase.tsx` (VD: `ChatFlow.tsx`, `TaskItem.tsx`).
- **Hooks & Utilities:** Tên custom hook dùng `camelCase.ts` theo cú pháp `use[Name]` (VD: `useSseStream.ts`).

### Format Patterns

**API Response Formats:**
Mọi APIs (ngoại trừ cấu trúc luồng SSE đặc thù) bắt buộc bọc payload JSON theo wrapper chuẩn để tránh conflict khi FE parse data.
- **Thành công (Success):** `{ "data": <payload>, "meta": { "traceId": "1234..." } }`
- **Thất bại (Error):** `{ "error": { "code": "RESOURCE_NOT_FOUND", "message": "Details", "traceId": "1234..." } }`

**Data Exchange Formats:**
- 100% JSON properties mạng (truyền tải qua REST API/SSE) phải ở chuẩn `camelCase`.
- Dữ liệu Boolean luôn mang tiền tố `is`, `has`, `can`, `should` (VD: `isCompleted`, `hasPermission`).

### Communication Patterns

**Event System Patterns:**
- Mẫu đặt tên Event bên trong hệ thống NestJS Event Emitter / BullMQ phải là `domain.action.result` kết hợp dấu chấm và `kebab-case` (VD: `onboarding.task.completed`).

**State Management Patterns (Zustand):**
- Core principles: Không thay đổi thuộc tính (mutate) trực tiếp trên State Object của Store. Bắt buộc dùng Spread Operator hoặc bọc state modification qua middleware `immer`.

### Process Patterns

**Error Handling Patterns (Backend NestJS):**
- **Nghiêm cấm** dùng `try-catch` nuốt lỗi hoặc return object kiểu `{ error: true }` rệu rã ở level Controller / Service.
- Mọi logic lỗi thất bại (Auth fail, DB fail) phải `throw` Exception chuẩn định dạng của NestJS (VD: `throw new UnauthorizedException()`). Một khối `GlobalExceptionFilter` tập trung ở App Layer sẽ chụp lại mọi Exception này để định dạng sang Error Format Wrapper và nạp vô file Audit Logs.

**Loading State Patterns (Frontend React):**
- Biến kiểm soát trạng thái chờ không được đặt bâng quơ như `loading`, `wait`.
- Naming bắt buộc có phân định trạng từ: `isLoading`, `isSubmitting`, `isStreamActive`.

## Project Structure & Boundaries

### Complete Project Directory Structure

```text
openclaw-team/
├── PLAN.md & AGENTS.md     # Project Rules & Roadmaps
├── data/                   # [Source of Truth 2] Tài liệu Markdown tĩnh
│   ├── onboarding/         # (handbook, FAQ, policies...)
│   └── training/           # (course catalog, rubrics...)
├── generated/              # Context tạm sinh ra cho từng Session/User
│   └── context/
├── fe/                     # FRONTEND (Vite + React + TS)
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   └── src/
│       ├── assets/
│       ├── components/     # UI Components (Shadcn/Radix, Buttons, Cards)
│       ├── features/       # Feature-based logic (Chat, Dashboard, Tasks)
│       ├── hooks/          # Custom hooks (useSseStream, useAuth)
│       ├── store/          # Zustand state (chatStore.ts)
│       ├── services/       # API call wrappers (TanStack query fns)
│       ├── utils/
│       └── App.tsx
├── be/                     # BACKEND (NestJS + Prisma + BullMQ)
│   ├── package.json
│   ├── nest-cli.json
│   ├── prisma/
│   │   ├── schema.prisma   # PostgreSQL Models
│   │   └── migrations/
│   └── src/
│       ├── main.ts
│       ├── app.module.ts
│       ├── core/           # Core Module (Guards, Interceptors, Filters, Throttler)
│       ├── auth/           # IAM, Login, Scoped Token Generator
│       ├── modules/        # Business Modules
│       │   ├── openclaw/   # [Module đệm] Gọi và streaming dữ liệu từ Python/LLM
│       │   ├── onboarding/ # Internal Tools APIs (Tasks, FAQ)
│       │   ├── training/   # Internal Tools APIs (Courses, Paths)
│       │   └── analytics/  # Internal Tools APIs (Reports)
│       └── shared/         # Utilities, Redis/BullMQ configs
└── openclaw/               # AI ENGINE (Python / LlamaIndex / LangChain)
    ├── main.py
    ├── agents/             # Định nghĩa logic các Agent chuyên trách
    │   ├── onboarding_agent.py
    │   ├── learning_agent.py
    │   └── analytics_agent.py
    └── requirements.txt
```

### Architectural Boundaries

**API Boundaries:**
- **External API Boundary (FE ↔ BE):** Điểm giao tiếp duy nhất giữa Client và hệ thống. Yêu cầu `user_access_token`. FE không được giao tiếp thẳng với AI Engine dưới mọi hình thức.
- **Internal Tool API Boundary (OpenClaw ↔ BE):** Trạm cửa khẩu cấp data cho AI. Yêu cầu có `internal_scoped_token` (JWT có TTL < 5 phút). (Hậu tố ví dụ: `/internal/tools/onboarding/faq`).
- **Orchestration Boundary (BE ↔ OpenClaw):** Cổng HTTP nội bộ phục vụ việc Backend đẩy thông điệp và ép OpenClaw làm việc.

**Data Boundaries:**
- **PostgreSQL Database:** Chịu sự quản lý độc quyền của Backend ORM (Prisma). Agent không được đọc schema hay connection string.
- **Knowledge Base `data/`:** Kho tài liệu tĩnh. AI Engine (`openclaw/`) có quyền thực thi kỹ thuật load/index semantic search trực tiếp.
- **Workspace `generated/`:** Khoảng không ghi đệm (buffer) để chứa Context dạng `.md` ngắn hạn tiêm vào prompt, cấm sử dụng để lưu state hệ thống (source of truth).

### Integration Points

**Data Flow (Luồng Chảy Dữ Liệu MVP/Chat Stream):**
1. User bấm gửi câu hỏi trên Frontend (từ module `fe/src/features/chat`).
2. Tác vụ FE gọi HTTP POST lên cổng Backend `/api/chat/stream`. 
3. Backend (`be/src/modules/openclaw`) lọc User Profile trong CSDL làm Context, đính kèm `internal_scoped_token` tương ứng với Role của user, sau đó Call sang AI Engine.
4. Agent tư duy và xin gọi REST API qua `GET /internal/tools/onboarding/tasks` tại Backend.
5. Backend System Guard kiểm chứng Scope của token hợp lệ, Query Database, và nhả kết quả JSON.
6. OpenClaw nhận được JSON, sinh token LLM, gọi Streaming trả ngược luồng về Backend.
7. Backend đẩy định dạng SSE (Server-Sent Events) quay lại Frontend. Render trên màn hình qua `EventSource`.

### Requirements to Structure Mapping

**Epic: Onboarding Chat (MVP)**
- Giao diện Client: Ngụ tại `fe/src/features/chat/`, giao tiếp qua `fe/src/hooks/useSseStream.ts`
- Luồng Xử Lý Backend: Cụm module `be/src/modules/openclaw/`, và `be/src/modules/onboarding/`
- Trạm suy luận AI: Nằm hoàn toàn ở script `openclaw/agents/onboarding_agent.py`

## Architecture Validation Results

### Coherence Validation ✅

**Decision Compatibility:**
Tất cả các quyết định (React/Vite ↔ NestJS ↔ PostgreSQL ↔ Redis) tương thích hoàn hảo. Zero-Trust Sandbox (Thông qua JWT `internal_scoped_token` mã hoá) đáp ứng trọn vẹn yêu cầu cấu trúc bảo mật khắt khe.

**Pattern Consistency:**
Các Format Patterns (như dùng `camelCase` cho DTO Request, `snake_case` ép xuống Prisma DB) khớp nối mượt mà giữa luồng Typescript Backend và luồng Functional Frontend.

**Structure Alignment:**
Việc chia cắt thành 3 Monorepo riêng biệt (`fe/`, `be/`, `openclaw/`) đã bảo tồn vĩnh viễn quy định sống còn tại `AGENTS.md`: "Mọi request lên AI đều phải ủy thác thông qua tầng Backend".

### Requirements Coverage Validation ✅

**Epic/Feature Coverage:**
Luồng xử lý xương sống của hệ thống (Ví dụ: Chat AI Onboarding) đã hình thành đầy đủ các node: UI React POST → Backend Orchestrator cấp Token → Agent Engine Reasoning → Backend Validation & Phân luồng SSE → Cập nhật UI EventSource Client.

**Functional & Non-Functional Requirements Coverage:**
- TTFT < 3s: Được bảo đảm chắc chắn bằng Redis Session Caching và chuẩn truyền tải Stream HTTP/2 (SSE).
- Security Guardrails: Phủ đầy rào chắn vòng ngoài (`@nestjs/throttler`) lẫn rào chắn vòng trong (`UserAccessGuard` + `InternalAgentGuard`).

### Implementation Readiness Validation ✅

**Decision Completeness:**
Công nghệ lõi đã xác định chi tiết đến Minor Version hiện đại nhất (Zustand v5.x, React Query v5.x, Tailwind CSS v4.x, Nest Throttler v6.x).

**Structure Completeness:**
Bản "Hiến pháp coding" và định dạng Project Tree chi tiết là lá chắn tuyệt đối chặn đứng sự bay bổng ảo giác (hallucination) viết code tùy tiện khác chuẩn của các AI Dev Agents.

### Architecture Completeness Checklist

- [x] Phân tích bối cảnh và giới hạn (Project context thoroughly analyzed).
- [x] Xác định ràng buộc quy mô (Scale and complexity assessed).
- [x] Các quyết định cốt lõi và Version chốt cố định (Critical decisions documented).
- [x] Quy ước Patterns về Naming, Logic Flow chuẩn hóa (Implementation Patterns).
- [x] Cây thư mục vật lý minh bạch (Directory structure defined).
- [x] Toàn bộ Quyết định được Validate chéo không xung đột (Coherence Validated).

### Architecture Readiness Assessment

**Overall Status:** READY FOR IMPLEMENTATION (SẴN SÀNG CHUYỂN GIAO TRIỂN KHAI)
**Confidence Level:** HIGH (Rất tự tin - nhờ kiến trúc Decoupled cắt rời logic và chia Module bảo vệ qua Backend Control Plane).

**Key Strengths:** Tính Modular & Scalability cực kỳ mạnh. Sự tách rời giữa `be/` và AI Engine `openclaw/` đảm bảo việc thay mẫu/đổi model trí tuệ nhân tạo (vd: Đổi LLM cung cấp) tuyệt đối 100% không ảnh hưởng tới UI Frontend.

**Areas for Future Enhancement:** Sẽ cần định nghĩa thêm kho phân tích Sentiment và Data-warehousing khi mở khóa nhóm Agent Analytics chuyên sâu ở Phase báo cáo của công ty.

### Implementation Handoff

**AI Agent Guidelines:**
- Toàn bộ Dev Agent bắt buộc phải fetch tài liệu `architecture.md` này song hành cùng `AGENTS.md` làm luật ưu tiên trước khi code.
- Áp đặt gắt gao tiêu chuẩn `kebab-case` cho URL API và `camelCase` cho JSON.

**First Implementation Priority:**
```bash
npm create vite@latest fe -- --template react-ts
npx @nestjs/cli new be --strict --package-manager npm
```
