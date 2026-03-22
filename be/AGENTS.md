# AGENTS.md
## Hướng dẫn agent dành riêng cho Backend

## 1. Mục tiêu file này

File này mô tả nguyên tắc coding và kiến trúc bắt buộc cho phần `be/`.

Backend là trung tâm điều phối của toàn hệ thống.
Backend không phải chỉ là CRUD app.
Backend là:
- auth server
- RBAC engine
- agent router
- context builder
- business API server
- internal tool API server
- audit/logging layer

---

## 2. Nguyên tắc bắt buộc

### RULE-BE-01
Backend là **entry point chính** cho toàn bộ user request.

Frontend chỉ gọi backend.
Không có route nào cho FE gọi OpenClaw trực tiếp.

### RULE-BE-02
Mọi quyền phải được enforce ở backend.

Backend phải quyết định:
- user nào được dùng agent nào
- user nào được xem tài liệu nào
- agent nào được gọi API nào
- tool request nào hợp lệ

### RULE-BE-03
Không dùng token user thật để cho OpenClaw gọi internal API.

Backend phải:
- verify `user_access_token`
- tạo `internal_scoped_token` ngắn hạn
- truyền token đó sang OpenClaw

### RULE-BE-04
Internal tool API phải được auth riêng.

Không có endpoint `/internal/tools/*` nào được mở trần.

### RULE-BE-05
Controller không chứa business logic lớn.

Controller chỉ:
- validate request cơ bản
- gọi service
- trả response

### RULE-BE-06
Không query DB trực tiếp từ controller.

Chỉ service / repository / ORM layer được query DB.

### RULE-BE-07
Không hardcode permission trong controller.

Permission phải đi qua:
- guard
- policy service
- permission service
- access evaluator

---

## 3. Cấu trúc module backend đề xuất

```text
be/
  src/
    app.ts
    server.ts

    config/
    common/
    libs/

    modules/
      auth/
      users/
      roles/
      permissions/
      agents/
      conversations/
      documents/
      onboarding/
      training/
      analytics/
      context/
      tool-gateway/
      audit/
```

---

## 4. Trách nhiệm từng module

## 4.1 auth
Làm:
- login
- refresh
- logout
- verify token
- current user

## 4.2 users
Làm:
- profile user
- department
- position
- manager mapping

## 4.3 roles / permissions
Làm:
- role matrix
- permission mapping
- role → agent access
- role → document access

## 4.4 agents
Làm:
- agent group registry
- agent routing
- agent access check
- map request → agent

Agent groups:
- onboarding_assistant
- learning_training_agent
- training_analytics_agent

## 4.5 conversations
Làm:
- create conversation
- list conversations
- store messages
- attach agent group to conversation

## 4.6 documents
Làm:
- metadata tài liệu
- allowed docs
- document permissions

## 4.7 onboarding
Làm:
- onboarding plan
- onboarding tasks
- user onboarding progress
- FAQ
- support contacts

## 4.8 training
Làm:
- skills
- courses
- user courses
- recommendations
- learning path
- quiz

## 4.9 analytics
Làm:
- progress analytics
- feedback
- reports
- KPI snapshots

## 4.10 context
Làm:
- build user context
- build session context
- build allowed resources
- build lightweight prompt context cho OpenClaw

## 4.11 tool-gateway
Làm:
- xác thực internal tool calls
- map tool endpoint → backend service
- enforce scope
- log tool invocations

## 4.12 audit
Làm:
- audit trail
- failed auth / failed permission
- tool usage log
- agent routing log

---

## 5. Luồng chuẩn backend

### Bước 1
FE gọi external API của BE với `user_access_token`.

### Bước 2
BE verify user:
- userId
- role
- department
- position
- allowed agent groups

### Bước 3
BE route sang agent phù hợp.

### Bước 4
BE build context.

### Bước 5
BE tạo `internal_scoped_token`.

Token này phải có:
- `agent`
- `userId`
- `conversationId`
- `scope`
- `iat`
- `exp`
- `jti`

### Bước 6
BE gọi OpenClaw client.

### Bước 7
OpenClaw gọi lại `/internal/tools/*` bằng token nội bộ.

### Bước 8
BE verify internal token:
- signature
- audience
- expiry
- agent
- scope
- userId

### Bước 9
BE service query DB / docs / generated files.

### Bước 10
BE trả JSON về tool / OpenClaw.

### Bước 11
BE nhận final response từ OpenClaw, lưu DB rồi trả FE.

---

## 6. Quy tắc auth

## 6.1 External API auth
Dùng:
- `Authorization: Bearer <user_access_token>`

## 6.2 Internal Tool API auth
Dùng:
- `Authorization: Bearer <internal_scoped_token>`
- có thể kèm thêm:
  - `X-Agent-Name`
  - `X-Conversation-Id`
  - `X-Trace-Id`

## 6.3 Không dùng token env cố định cho mọi request
Không chốt kiểu:
- 1 `INTERNAL_AGENT_TOKEN` cố định cho toàn bộ user và toàn bộ session

Cách đúng là:
- token nội bộ phải thay đổi theo request / session / user / agent / scope

---

## 7. Chuẩn prefix route

## External APIs
```text
/auth/*
/chat/*
/conversations/*
/me/*
/api/*
```

## Internal Tool APIs
```text
/internal/tools/onboarding/*
/internal/tools/training/*
/internal/tools/analytics/*
```

---

## 8. Quy tắc internal APIs

Mỗi internal endpoint phải:
- require internal token
- check agent group đúng
- check scope đúng
- check user context đúng
- check ownership khi cần

Ví dụ:
- onboarding agent không được gọi analytics report endpoint
- learning agent không được gọi feedback toàn công ty nếu không có scope
- analytics agent mới được generate report

---

## 9. Quy tắc response

### Thành công
```json
{
  "success": true,
  "data": {},
  "meta": {}
}
```

### Lỗi
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

---

## 10. Quy tắc observability

Tất cả request quan trọng phải có:
- `traceId`
- `conversationId`
- `userId`
- `agentGroup`
- `toolName` nếu có

Log được:
- chat request
- chat response
- route agent
- tool call
- internal API result
- permission denied
- timeout / error

---

## 11. Quy tắc dữ liệu

DB là source of truth.
Không lấy `generated/*.md` làm dữ liệu chính.

`generated/` chỉ dùng để:
- session context
- user summary
- generated learning path view
- generated report view

---

## 12. Điều không được làm

- Không cho FE gọi OpenClaw
- Không cho OpenClaw query DB trực tiếp
- Không mở internal routes công khai
- Không dùng token user thật cho OpenClaw
- Không hardcode role check rải rác khắp controller
- Không trộn external API và internal tool API

---

## 13. Kết luận

Câu chốt cho coding agent backend:

**Backend là control plane của toàn hệ thống. Mọi auth, permission, routing, internal APIs và data access đều phải tập trung ở backend.**
