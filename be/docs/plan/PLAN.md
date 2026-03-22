# PLAN.md
## Kế hoạch triển khai riêng cho Backend

## 1. Mục tiêu backend

Backend phải được xây như một **modular monolith control plane** cho toàn hệ thống.

Backend phải chịu trách nhiệm:
- authentication
- authorization
- RBAC
- agent routing
- context building
- conversations/messages
- business APIs
- internal tool APIs
- audit / observability
- OpenClaw integration

---

## 2. Kiến trúc backend

```text
Frontend
  ↓
External APIs
  ↓
Auth / Guards / Policy
  ↓
Services
  ↓
Agent Router + Context Builder
  ↓
OpenClaw Client
  ↓
Internal Tool APIs
  ↓
Services / Repositories
  ↓
PostgreSQL / data / generated
```

---

## 3. Module cần có

## 3.1 auth
- login
- refresh
- logout
- verify token
- me

## 3.2 users
- profile
- department
- position
- manager

## 3.3 roles / permissions
- role definitions
- permission matrix
- access evaluator

## 3.4 agents
- registry
- route by intent/policy
- agent access

## 3.5 conversations
- create conversation
- store messages
- list messages

## 3.6 documents
- documents metadata
- permission by role

## 3.7 onboarding
- plans
- tasks
- user progress
- FAQ
- contacts
- policies

## 3.8 training
- skills
- courses
- recommendations
- learning path
- quiz

## 3.9 analytics
- overview
- progress
- feedback
- reports

## 3.10 context
- user summary
- conversation summary
- allowed resources
- prompt context

## 3.11 tool-gateway
- internal tool auth
- scope check
- tool endpoint mapping
- tool call logging

## 3.12 audit
- audit trail
- security logs
- denied access logs
- tracing

---

## 4. Milestone triển khai

## Milestone 1
Khung backend:
- app bootstrap
- config
- logger
- error handling
- request id / trace id
- env validation

## Milestone 2
Core auth:
- login
- refresh
- guards
- current user
- role / permission base

## Milestone 3
Conversation + chat entry:
- POST /chat/message
- conversations
- messages
- agent router skeleton
- OpenClaw client skeleton

## Milestone 4
Internal auth:
- internal scoped token generator
- internal token verifier
- scope middleware
- agent name validation
- `/internal/tools/*` prefixes

## Milestone 5
Onboarding domain:
- onboarding tables
- onboarding services
- onboarding external APIs
- onboarding internal tool APIs

## Milestone 6
Training domain:
- training tables
- recommendation logic
- learning path logic
- quiz logic
- training internal tool APIs

## Milestone 7
Analytics domain:
- feedback
- overview
- report generation
- analytics internal tool APIs

## Milestone 8
Hardening:
- audit logs
- retries / timeout
- idempotency
- rate limit
- observability

---

## 5. Luồng backend chuẩn

### Bước 1
External request vào:
- `Authorization: Bearer <user_access_token>`

### Bước 2
Auth guard verify user

### Bước 3
Policy layer xác định:
- allowed agent groups
- allowed docs
- allowed scopes

### Bước 4
Agent router chọn:
- onboarding_assistant
- learning_training_agent
- training_analytics_agent

### Bước 5
Context service build:
- user summary
- conversation summary
- allowed resources
- allowed docs

### Bước 6
Internal auth service tạo token nội bộ:
- `agent`
- `userId`
- `conversationId`
- `scope`
- `exp`

### Bước 7
OpenClaw client gọi OpenClaw.

### Bước 8
OpenClaw gọi `/internal/tools/*`.

### Bước 9
Internal guard verify:
- token signature
- audience
- expiry
- agent
- scope
- userId

### Bước 10
Service xử lý nghiệp vụ, query DB, trả JSON.

### Bước 11
Backend nhận final response, lưu message, trả FE.

---

## 6. Quy tắc route

## External routes
```text
/auth/*
/chat/*
/conversations/*
/me/*
/api/*
```

## Internal routes
```text
/internal/tools/onboarding/*
/internal/tools/training/*
/internal/tools/analytics/*
```

Không trộn 2 loại route.

---

## 7. Quy tắc internal token

Internal token phải là:
- JWT nội bộ
- sống ngắn
- khác secret với user JWT
- scoped theo agent + user + conversation + scope

Không dùng:
- token user thật
- token env cố định chung cho mọi request

---

## 8. Quy tắc DB

DB là source of truth.
Tất cả service đều đi qua ORM / repository layer.

Không được:
- query DB trực tiếp trong controller
- dùng generated files làm nguồn thật

---

## 9. Quy tắc response và error

### Success
```json
{
  "success": true,
  "data": {},
  "meta": {}
}
```

### Error
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

Error codes tối thiểu:
- UNAUTHORIZED
- FORBIDDEN
- VALIDATION_ERROR
- NOT_FOUND
- AGENT_ACCESS_DENIED
- TOOL_ACCESS_DENIED
- OPENCLAW_TIMEOUT
- INTERNAL_ERROR

---

## 10. Quy tắc code bắt buộc

- không hardcode permission trong controller
- không query DB trực tiếp từ controller
- mọi internal route đều phải auth
- mọi request quan trọng đều có trace id
- mọi tool call phải log được
- mọi thao tác generate report / submit quiz nên có idempotency
- OpenClaw client phải có timeout + retry giới hạn

---

## 11. Tổ chức service nên có

- AuthService
- UserService
- PermissionService
- AgentAccessService
- AgentRouter
- ConversationService
- MessageService
- DocumentAccessService
- OnboardingService
- TrainingService
- AnalyticsService
- ContextBuilderService
- InternalTokenService
- OpenClawClient
- ToolAuthService
- AuditService

---

## 12. Kết luận

Backend phải được xây như một lớp orchestration + policy enforcement.

Câu chốt:

**Backend nắm user, role, permission, routing, business APIs, internal tool APIs và data access. OpenClaw chỉ là tầng AI worker được backend gọi xuống.**
