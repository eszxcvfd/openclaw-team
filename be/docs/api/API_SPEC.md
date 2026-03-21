# API_SPEC.md
## Tài liệu mô tả API, mapping với DB, JSON request/response, option thuộc tính và ví dụ mẫu

## 1. Mục tiêu tài liệu

Tài liệu này mô tả:
- các API chính của hệ thống
- API nào map với bảng nào trong database
- request JSON gửi như nào
- response JSON trả như nào
- các thuộc tính có option gì
- ví dụ sử dụng mẫu

Tài liệu này dùng cho:
- coding agent triển khai backend
- frontend developer gọi API
- developer viết tool để OpenClaw gọi API
- tester kiểm thử request/response

---

## 2. Quy ước chung

## 2.1 Base path

Có 2 nhóm API chính:

### External API
Dành cho frontend / app của người dùng gọi

```txt
/auth/*
/chat/*
/conversations/*
/me/*
/api/*
```

### Internal Tool API
Dành cho OpenClaw / tool layer gọi nội bộ

```txt
/internal/tools/onboarding/*
/internal/tools/training/*
/internal/tools/analytics/*
```

---

## 2.2 Content-Type

Tất cả API JSON dùng:

```http
Content-Type: application/json
```

---

## 2.3 Authentication

### External API
Dùng access token của user:

```http
Authorization: Bearer <user_access_token>
```

### Internal Tool API
Dùng service token hoặc internal token của agent/tool:

```http
Authorization: Bearer <internal_agent_token>
X-Agent-Name: onboarding_assistant
X-User-Id: 101
X-Conversation-Id: conv_123
X-Trace-Id: trace_abc_001
```

---

## 2.4 Format response chung

### Response thành công

```json
{
  "success": true,
  "data": {},
  "meta": {}
}
```

### Response lỗi

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

## 2.5 Error code chuẩn

- `UNAUTHORIZED`
- `FORBIDDEN`
- `VALIDATION_ERROR`
- `NOT_FOUND`
- `AGENT_ACCESS_DENIED`
- `TOOL_ACCESS_DENIED`
- `OPENCLAW_TIMEOUT`
- `INTERNAL_ERROR`

---

## 2.6 Option dùng chung

### `status` cho user
- `active`
- `inactive`
- `suspended`
- `pending`

### `onboarding task status`
- `pending`
- `in_progress`
- `completed`
- `skipped`

### `course status`
- `not_started`
- `in_progress`
- `completed`
- `failed`
- `cancelled`

### `attendance_status`
- `present`
- `absent`
- `late`
- `excused`

### `quiz question type`
- `single_choice`
- `multiple_choice`
- `true_false`
- `short_answer`

### `difficulty`
- `easy`
- `medium`
- `hard`

### `sentiment_label`
- `positive`
- `neutral`
- `negative`

### `report type`
- `department_summary`
- `course_summary`
- `user_progress`
- `training_overview`

---

## 3. Authentication APIs

# 3.1 POST /auth/login

## Mục đích
Đăng nhập người dùng.

## Bảng DB liên quan
- `users`
- `user_roles`
- `roles`

## Request JSON

```json
{
  "email": "employee01@company.com",
  "password": "123456"
}
```

## Thuộc tính request

### `email`
- kiểu: `string`
- bắt buộc: có
- ví dụ: `"employee01@company.com"`

### `password`
- kiểu: `string`
- bắt buộc: có

## Response JSON

```json
{
  "success": true,
  "data": {
    "accessToken": "jwt_access_token",
    "refreshToken": "jwt_refresh_token",
    "user": {
      "id": 101,
      "fullName": "Nguyễn Văn A",
      "email": "employee01@company.com",
      "status": "active",
      "department": {
        "id": 10,
        "name": "Engineering"
      },
      "position": {
        "id": 5,
        "name": "Intern"
      },
      "roles": [
        {
          "id": 2,
          "code": "employee",
          "name": "Employee"
        }
      ]
    }
  }
}
```

---

# 3.2 GET /auth/me

## Mục đích
Lấy thông tin user hiện tại sau khi đăng nhập.

## Bảng DB liên quan
- `users`
- `departments`
- `positions`
- `user_roles`
- `roles`

## Response JSON

```json
{
  "success": true,
  "data": {
    "id": 101,
    "fullName": "Nguyễn Văn A",
    "email": "employee01@company.com",
    "status": "active",
    "department": {
      "id": 10,
      "name": "Engineering"
    },
    "position": {
      "id": 5,
      "name": "Intern"
    },
    "roles": [
      {
        "id": 2,
        "code": "employee",
        "name": "Employee"
      }
    ]
  }
}
```

---

## 4. Chat APIs

# 4.1 POST /chat/message

## Mục đích
User gửi message lên backend. Backend chọn agent phù hợp rồi gọi OpenClaw.

## Bảng DB liên quan
- `conversations`
- `messages`
- `user_agent_access`
- có thể đọc thêm từ nhiều bảng nghiệp vụ tùy intent

## Logic
1. Xác thực user
2. Kiểm tra conversation
3. Route agent
4. Gọi OpenClaw
5. Lưu user message + assistant message
6. Trả kết quả về frontend

## Request JSON

```json
{
  "conversationId": "conv_001",
  "message": "Hôm nay tôi còn task onboarding nào chưa làm?"
}
```

## Thuộc tính request

### `conversationId`
- kiểu: `string`
- bắt buộc: không
- nếu không có thì backend tạo conversation mới

### `message`
- kiểu: `string`
- bắt buộc: có

## Response JSON

```json
{
  "success": true,
  "data": {
    "conversationId": "conv_001",
    "messageId": "msg_002",
    "agentGroup": "onboarding_assistant",
    "content": "Bạn còn 2 task onboarding chưa hoàn thành: Ký nhận tài khoản email công ty và hoàn thành khóa nội quy bảo mật.",
    "toolCalls": [
      {
        "tool": "get_my_checklist",
        "status": "success"
      }
    ],
    "timestamp": "2026-03-21T14:20:00Z"
  }
}
```

## Option `agentGroup`
- `onboarding_assistant`
- `learning_training_agent`
- `training_analytics_agent`

---

# 4.2 GET /conversations

## Mục đích
Lấy danh sách conversation của user hiện tại.

## Bảng DB liên quan
- `conversations`

## Query params
- `page`
- `limit`

## Response JSON

```json
{
  "success": true,
  "data": [
    {
      "id": "conv_001",
      "agentGroup": "onboarding_assistant",
      "startedAt": "2026-03-21T14:00:00Z",
      "lastMessageAt": "2026-03-21T14:20:00Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 1
  }
}
```

---

# 4.3 GET /conversations/:id/messages

## Mục đích
Lấy lịch sử message của một conversation.

## Bảng DB liên quan
- `messages`

## Response JSON

```json
{
  "success": true,
  "data": [
    {
      "id": "msg_001",
      "senderType": "user",
      "content": "Hôm nay tôi còn task onboarding nào chưa làm?",
      "createdAt": "2026-03-21T14:19:00Z"
    },
    {
      "id": "msg_002",
      "senderType": "assistant",
      "content": "Bạn còn 2 task onboarding chưa hoàn thành...",
      "createdAt": "2026-03-21T14:20:00Z"
    }
  ]
}
```

## Option `senderType`
- `user`
- `assistant`
- `system`

---

## 5. Onboarding APIs

# 5.1 GET /api/me/profile

## Mục đích
Lấy profile của user hiện tại.

## Bảng DB liên quan
- `users`
- `departments`
- `positions`
- `user_roles`
- `roles`

## Response JSON

```json
{
  "success": true,
  "data": {
    "id": 101,
    "fullName": "Nguyễn Văn A",
    "email": "employee01@company.com",
    "department": {
      "id": 10,
      "name": "Engineering"
    },
    "position": {
      "id": 5,
      "name": "Intern"
    },
    "joinDate": "2026-03-15",
    "status": "active"
  }
}
```

---

# 5.2 GET /api/me/onboarding

## Mục đích
Lấy tổng quan onboarding của user hiện tại.

## Bảng DB liên quan
- `users`
- `onboarding_plans`
- `onboarding_tasks`
- `user_onboarding_tasks`

## Mapping DB
- `users.position_id`, `users.department_id` → xác định plan
- `onboarding_plans.id` → `onboarding_tasks.plan_id`
- `user_onboarding_tasks.user_id` + `task_id` → trạng thái thực tế

## Response JSON

```json
{
  "success": true,
  "data": {
    "plan": {
      "id": 1,
      "name": "Intern Engineering Onboarding",
      "durationDays": 14
    },
    "summary": {
      "totalTasks": 5,
      "completedTasks": 2,
      "pendingTasks": 3,
      "progressPercent": 40
    }
  }
}
```

---

# 5.3 GET /api/me/checklist

## Mục đích
Lấy checklist onboarding chi tiết của user.

## Bảng DB liên quan
- `onboarding_tasks`
- `user_onboarding_tasks`

## Response JSON

```json
{
  "success": true,
  "data": [
    {
      "taskId": 1,
      "taskName": "Ký nhận tài khoản email công ty",
      "description": "Nhận email công ty từ IT",
      "orderNo": 1,
      "required": true,
      "dueDay": 1,
      "status": "completed",
      "completedAt": "2026-03-20T09:00:00Z"
    },
    {
      "taskId": 2,
      "taskName": "Hoàn thành khóa nội quy bảo mật",
      "description": "Học và xác nhận đã hiểu nội quy bảo mật",
      "orderNo": 2,
      "required": true,
      "dueDay": 3,
      "status": "pending",
      "completedAt": null
    }
  ]
}
```

## Option thuộc tính

### `required`
- kiểu: `boolean`
- option: `true | false`

### `status`
- `pending`
- `in_progress`
- `completed`
- `skipped`

---

# 5.4 POST /api/me/checklist/:taskId/complete

## Mục đích
Đánh dấu hoàn thành một task onboarding.

## Bảng DB liên quan
- `user_onboarding_tasks`

## Request JSON

```json
{
  "note": "Đã hoàn thành và xác nhận với HR"
}
```

## Thuộc tính request

### `note`
- kiểu: `string`
- bắt buộc: không

## Response JSON

```json
{
  "success": true,
  "data": {
    "taskId": 2,
    "status": "completed",
    "completedAt": "2026-03-21T14:30:00Z"
  }
}
```

---

# 5.5 GET /api/faq?category=onboarding

## Mục đích
Lấy FAQ theo category.

## Bảng DB liên quan
- `faq_items`

## Query params

### `category`
option:
- `onboarding`
- `training`
- `general`

## Response JSON

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "question": "Ngày đầu đi làm cần chuẩn bị gì?",
      "answer": "Bạn cần mang CCCD, laptop nếu có và kiểm tra email mời nhận việc."
    }
  ]
}
```

---

# 5.6 GET /api/contacts/support

## Mục đích
Lấy danh bạ hỗ trợ nội bộ.

## Bảng DB liên quan
- `contacts_directory`

## Response JSON

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Phòng IT Support",
      "department": "IT",
      "role": "Support",
      "email": "it-support@company.com",
      "phone": "0123456789",
      "supportType": "account"
    }
  ]
}
```

## Option `supportType`
- `account`
- `device`
- `hr`
- `training`
- `general`

---

## 6. Training APIs

# 6.1 GET /api/me/skills

## Mục đích
Lấy kỹ năng hiện tại của user.

## Bảng DB liên quan
- `user_skills`
- `skills`

## Response JSON

```json
{
  "success": true,
  "data": [
    {
      "skillId": 1,
      "skillName": "NodeJS",
      "category": "backend",
      "level": 2,
      "lastUpdated": "2026-03-01T10:00:00Z"
    },
    {
      "skillId": 2,
      "skillName": "PostgreSQL",
      "category": "database",
      "level": 1,
      "lastUpdated": "2026-03-01T10:00:00Z"
    }
  ]
}
```

## Option `level`
- kiểu: `number`
- gợi ý dùng: `1..5`

---

# 6.2 GET /api/me/courses

## Mục đích
Lấy danh sách khóa học của user.

## Bảng DB liên quan
- `user_courses`
- `courses`

## Query params
- `status` (optional)

## Option `status`
- `not_started`
- `in_progress`
- `completed`
- `failed`
- `cancelled`

## Response JSON

```json
{
  "success": true,
  "data": [
    {
      "courseId": 11,
      "title": "NodeJS Basic",
      "category": "backend",
      "level": "beginner",
      "status": "in_progress",
      "progressPercent": 60,
      "score": null
    }
  ]
}
```

## Option `level` của course
- `beginner`
- `intermediate`
- `advanced`

---

# 6.3 GET /api/courses

## Mục đích
Lấy danh mục khóa học được phép truy cập.

## Bảng DB liên quan
- `courses`
- `course_skills`

## Query params
- `category`
- `level`
- `keyword`

## Response JSON

```json
{
  "success": true,
  "data": [
    {
      "id": 11,
      "title": "NodeJS Basic",
      "category": "backend",
      "level": "beginner",
      "durationHours": 8,
      "format": "online",
      "isActive": true
    }
  ]
}
```

## Option `format`
- `online`
- `offline`
- `hybrid`

---

# 6.4 GET /api/courses/:id

## Mục đích
Lấy chi tiết một khóa học.

## Bảng DB liên quan
- `courses`
- `course_skills`
- `course_prerequisites`

## Response JSON

```json
{
  "success": true,
  "data": {
    "id": 11,
    "title": "NodeJS Basic",
    "description": "Khóa học nhập môn NodeJS",
    "category": "backend",
    "level": "beginner",
    "durationHours": 8,
    "format": "online",
    "skills": [
      {
        "skillId": 1,
        "skillName": "NodeJS",
        "outcomeLevel": 2
      }
    ],
    "prerequisites": []
  }
}
```

---

# 6.5 GET /api/me/training-recommendations

## Mục đích
Lấy danh sách khóa học được gợi ý cho user.

## Bảng DB liên quan
- `users`
- `positions`
- `role_skill_requirements`
- `user_skills`
- `courses`
- `course_skills`
- `user_courses`

## Logic mapping
- xác định vị trí hiện tại của user
- lấy skill requirement theo vị trí
- so sánh với skill hiện tại
- chọn courses phù hợp để bù skill gap

## Response JSON

```json
{
  "success": true,
  "data": [
    {
      "courseId": 11,
      "title": "NodeJS Basic",
      "reason": "Bạn đang thiếu kỹ năng NodeJS ở mức yêu cầu cho vị trí Intern Backend",
      "priority": 1
    },
    {
      "courseId": 12,
      "title": "Security Policy",
      "reason": "Khóa học bắt buộc cho nhân viên mới",
      "priority": 2
    }
  ]
}
```

---

# 6.6 GET /api/me/learning-path

## Mục đích
Lấy lộ trình học hiện tại của user.

## Bảng DB liên quan
- `learning_paths`
- `learning_path_items`
- `courses`

## Response JSON

```json
{
  "success": true,
  "data": {
    "id": 5,
    "name": "Intern Backend Path",
    "items": [
      {
        "orderNo": 1,
        "courseId": 12,
        "courseTitle": "Product Overview",
        "required": true
      },
      {
        "orderNo": 2,
        "courseId": 11,
        "courseTitle": "NodeJS Basic",
        "required": true
      }
    ]
  }
}
```

---

# 6.7 POST /api/me/learning-path/generate

## Mục đích
Sinh lộ trình học cá nhân hóa.

## Bảng DB liên quan
- `users`
- `user_skills`
- `role_skill_requirements`
- `courses`
- `course_skills`
- `learning_paths`
- `learning_path_items`

## Request JSON

```json
{
  "targetLevel": "intern",
  "maxCourses": 5,
  "includeMandatoryCourses": true
}
```

## Thuộc tính request

### `targetLevel`
option gợi ý:
- `intern`
- `junior`
- `mid`
- `senior`

### `maxCourses`
- kiểu: `number`
- ví dụ: `5`

### `includeMandatoryCourses`
- kiểu: `boolean`

## Response JSON

```json
{
  "success": true,
  "data": {
    "generated": true,
    "learningPath": {
      "name": "Generated Path for User 101",
      "items": [
        {
          "orderNo": 1,
          "courseId": 12,
          "title": "Product Overview"
        },
        {
          "orderNo": 2,
          "courseId": 11,
          "title": "NodeJS Basic"
        }
      ]
    }
  }
}
```

---

# 6.8 POST /api/quiz/generate

## Mục đích
Sinh quiz từ course hoặc topic.

## Bảng DB liên quan
- `quiz_templates`
- `quiz_questions`
- `courses`

## Request JSON

```json
{
  "courseId": 11,
  "difficulty": "easy",
  "questionCount": 5,
  "questionTypes": ["single_choice", "true_false"]
}
```

## Thuộc tính request

### `courseId`
- kiểu: `number`
- bắt buộc: có

### `difficulty`
- `easy`
- `medium`
- `hard`

### `questionCount`
- kiểu: `number`

### `questionTypes`
- mảng string
- option từng phần tử:
  - `single_choice`
  - `multiple_choice`
  - `true_false`
  - `short_answer`

## Response JSON

```json
{
  "success": true,
  "data": {
    "quizId": 2001,
    "title": "Quiz - NodeJS Basic",
    "difficulty": "easy",
    "questions": [
      {
        "id": 1,
        "type": "single_choice",
        "questionText": "NodeJS chạy trên môi trường nào?",
        "options": [
          "Browser only",
          "Server-side JavaScript runtime",
          "Mobile app only",
          "Database engine"
        ]
      }
    ]
  }
}
```

### `options`
- chỉ áp dụng với:
  - `single_choice`
  - `multiple_choice`

---

# 6.9 POST /api/quiz/submit

## Mục đích
Nộp kết quả quiz.

## Bảng DB liên quan
- `quiz_attempts`
- có thể ghi thêm kết quả chi tiết nếu hệ thống mở rộng

## Request JSON

```json
{
  "quizId": 2001,
  "answers": [
    {
      "questionId": 1,
      "answer": "Server-side JavaScript runtime"
    },
    {
      "questionId": 2,
      "answer": true
    }
  ],
  "durationSeconds": 180
}
```

## Thuộc tính request

### `answers[].answer`
có thể là:
- `string`
- `boolean`
- `string[]`

tùy theo loại câu hỏi

## Response JSON

```json
{
  "success": true,
  "data": {
    "attemptId": 9001,
    "quizId": 2001,
    "score": 8.5,
    "submittedAt": "2026-03-21T14:50:00Z"
  }
}
```

---

# 6.10 GET /api/quiz/:id/result

## Mục đích
Lấy kết quả quiz đã nộp.

## Bảng DB liên quan
- `quiz_attempts`

## Response JSON

```json
{
  "success": true,
  "data": {
    "attemptId": 9001,
    "quizId": 2001,
    "score": 8.5,
    "durationSeconds": 180,
    "submittedAt": "2026-03-21T14:50:00Z"
  }
}
```

---

## 7. Analytics APIs

# 7.1 GET /api/training/analytics/overview

## Mục đích
Lấy tổng quan đào tạo.

## Bảng DB liên quan
- `user_courses`
- `quiz_attempts`
- `training_feedback`
- `analytics_snapshots`

## Response JSON

```json
{
  "success": true,
  "data": {
    "completionRate": 72.5,
    "averageScore": 8.1,
    "satisfactionScore": 4.2,
    "activeLearners": 120
  }
}
```

---

# 7.2 GET /api/training/analytics/progress

## Mục đích
Lấy tiến độ học theo user.

## Bảng DB liên quan
- `user_courses`
- `users`

## Query params
- `userId`

## Response JSON

```json
{
  "success": true,
  "data": {
    "userId": 101,
    "fullName": "Nguyễn Văn A",
    "courses": [
      {
        "courseId": 11,
        "title": "NodeJS Basic",
        "status": "in_progress",
        "progressPercent": 60,
        "score": null
      }
    ]
  }
}
```

---

# 7.3 GET /api/training/analytics/department

## Mục đích
Lấy báo cáo đào tạo theo phòng ban.

## Bảng DB liên quan
- `users`
- `departments`
- `user_courses`
- `quiz_attempts`
- `training_feedback`

## Query params
- `departmentId`

## Response JSON

```json
{
  "success": true,
  "data": {
    "departmentId": 10,
    "departmentName": "Engineering",
    "completionRate": 75,
    "averageScore": 8.3,
    "satisfactionScore": 4.4
  }
}
```

---

# 7.4 GET /api/training/analytics/course

## Mục đích
Lấy báo cáo theo khóa học.

## Bảng DB liên quan
- `courses`
- `user_courses`
- `training_feedback`

## Query params
- `courseId`

## Response JSON

```json
{
  "success": true,
  "data": {
    "courseId": 11,
    "courseTitle": "NodeJS Basic",
    "enrolledUsers": 40,
    "completedUsers": 32,
    "completionRate": 80,
    "averageRating": 4.5
  }
}
```

---

# 7.5 GET /api/training/feedback

## Mục đích
Lấy danh sách feedback.

## Bảng DB liên quan
- `training_feedback`
- `users`
- `courses`

## Query params
- `courseId`
- `departmentId`
- `sentimentLabel`

## Option `sentimentLabel`
- `positive`
- `neutral`
- `negative`

## Response JSON

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "userId": 101,
      "courseId": 11,
      "rating": 5,
      "comment": "Khóa học dễ hiểu và thực tế",
      "sentimentLabel": "positive",
      "createdAt": "2026-03-21T10:00:00Z"
    }
  ]
}
```

---

# 7.6 POST /api/training/feedback/analyze

## Mục đích
Phân tích feedback thành sentiment và summary.

## Bảng DB liên quan
- `training_feedback`

## Request JSON

```json
{
  "courseId": 11,
  "fromDate": "2026-03-01",
  "toDate": "2026-03-21"
}
```

## Response JSON

```json
{
  "success": true,
  "data": {
    "courseId": 11,
    "summary": "Phần lớn phản hồi tích cực, nhiều người đánh giá nội dung thực tế.",
    "sentimentBreakdown": {
      "positive": 18,
      "neutral": 5,
      "negative": 2
    }
  }
}
```

---

# 7.7 POST /api/training/reports/generate

## Mục đích
Sinh báo cáo đào tạo.

## Bảng DB liên quan
- `reports`
- đọc thêm từ `user_courses`, `quiz_attempts`, `training_feedback`, `departments`, `courses`

## Request JSON

```json
{
  "type": "department_summary",
  "departmentId": 10,
  "period": {
    "from": "2026-03-01",
    "to": "2026-03-21"
  },
  "exportFormat": "md"
}
```

## Thuộc tính request

### `type`
- `department_summary`
- `course_summary`
- `user_progress`
- `training_overview`

### `exportFormat`
- `md`
- `pdf`
- `json`

## Response JSON

```json
{
  "success": true,
  "data": {
    "reportId": 501,
    "type": "department_summary",
    "filePath": "generated/analytics/reports/501.md",
    "createdAt": "2026-03-21T15:10:00Z"
  }
}
```

---

# 7.8 GET /api/training/reports

## Mục đích
Lấy danh sách report đã sinh.

## Bảng DB liên quan
- `reports`

## Response JSON

```json
{
  "success": true,
  "data": [
    {
      "id": 501,
      "type": "department_summary",
      "period": "2026-03-01 -> 2026-03-21",
      "filePath": "generated/analytics/reports/501.md",
      "createdAt": "2026-03-21T15:10:00Z"
    }
  ]
}
```

---

# 7.9 GET /api/training/reports/:id

## Mục đích
Lấy chi tiết một report.

## Bảng DB liên quan
- `reports`

## Response JSON

```json
{
  "success": true,
  "data": {
    "id": 501,
    "type": "department_summary",
    "period": {
      "from": "2026-03-01",
      "to": "2026-03-21"
    },
    "filePath": "generated/analytics/reports/501.md",
    "createdAt": "2026-03-21T15:10:00Z"
  }
}
```

---

## 8. Internal Tool APIs

Phần này dành cho OpenClaw gọi qua tool.

Nguyên tắc:
- tool không gọi DB trực tiếp
- tool gọi backend internal API
- backend internal API kiểm tra:
  - internal token
  - agent name
  - user id
  - trace id
  - scope

---

# 8.1 GET /internal/tools/onboarding/me/checklist

## Mục đích
Tool API cho Onboarding Assistant lấy checklist của user.

## Được phép gọi bởi agent
- `onboarding_assistant`

## Bảng DB liên quan
- `user_onboarding_tasks`
- `onboarding_tasks`

## Header mẫu

```http
Authorization: Bearer internal_agent_token
X-Agent-Name: onboarding_assistant
X-User-Id: 101
X-Conversation-Id: conv_001
X-Trace-Id: trace_001
```

## Response JSON

```json
{
  "success": true,
  "data": [
    {
      "taskId": 1,
      "taskName": "Ký nhận tài khoản email công ty",
      "status": "completed"
    },
    {
      "taskId": 2,
      "taskName": "Hoàn thành khóa nội quy bảo mật",
      "status": "pending"
    }
  ]
}
```

---

# 8.2 GET /internal/tools/training/me/skills

## Mục đích
Tool API cho Learning Agent lấy kỹ năng hiện tại.

## Được phép gọi bởi agent
- `learning_training_agent`

## Bảng DB liên quan
- `user_skills`
- `skills`

---

# 8.3 POST /internal/tools/training/quiz/generate

## Mục đích
Tool API cho Learning Agent sinh quiz.

## Được phép gọi bởi agent
- `learning_training_agent`

## Bảng DB liên quan
- `quiz_templates`
- `quiz_questions`

---

# 8.4 GET /internal/tools/analytics/department

## Mục đích
Tool API cho Analytics Agent lấy số liệu phòng ban.

## Được phép gọi bởi agent
- `training_analytics_agent`

## Bảng DB liên quan
- `users`
- `departments`
- `user_courses`
- `quiz_attempts`
- `training_feedback`

---

## 9. Mapping nhanh: API ↔ DB

# Auth
- `POST /auth/login`
  - `users`
  - `user_roles`
  - `roles`

- `GET /auth/me`
  - `users`
  - `departments`
  - `positions`
  - `user_roles`
  - `roles`

# Chat
- `POST /chat/message`
  - `conversations`
  - `messages`
  - `user_agent_access`

- `GET /conversations`
  - `conversations`

- `GET /conversations/:id/messages`
  - `messages`

# Onboarding
- `GET /api/me/profile`
  - `users`
  - `departments`
  - `positions`

- `GET /api/me/onboarding`
  - `users`
  - `onboarding_plans`
  - `onboarding_tasks`
  - `user_onboarding_tasks`

- `GET /api/me/checklist`
  - `onboarding_tasks`
  - `user_onboarding_tasks`

- `POST /api/me/checklist/:taskId/complete`
  - `user_onboarding_tasks`

- `GET /api/faq`
  - `faq_items`

- `GET /api/contacts/support`
  - `contacts_directory`

# Training
- `GET /api/me/skills`
  - `user_skills`
  - `skills`

- `GET /api/me/courses`
  - `user_courses`
  - `courses`

- `GET /api/courses`
  - `courses`

- `GET /api/courses/:id`
  - `courses`
  - `course_skills`
  - `course_prerequisites`

- `GET /api/me/training-recommendations`
  - `users`
  - `role_skill_requirements`
  - `user_skills`
  - `courses`
  - `course_skills`
  - `user_courses`

- `GET /api/me/learning-path`
  - `learning_paths`
  - `learning_path_items`
  - `courses`

- `POST /api/me/learning-path/generate`
  - `users`
  - `user_skills`
  - `role_skill_requirements`
  - `courses`
  - `course_skills`
  - `learning_paths`
  - `learning_path_items`

- `POST /api/quiz/generate`
  - `quiz_templates`
  - `quiz_questions`
  - `courses`

- `POST /api/quiz/submit`
  - `quiz_attempts`

- `GET /api/quiz/:id/result`
  - `quiz_attempts`

# Analytics
- `GET /api/training/analytics/overview`
  - `user_courses`
  - `quiz_attempts`
  - `training_feedback`
  - `analytics_snapshots`

- `GET /api/training/analytics/progress`
  - `users`
  - `user_courses`

- `GET /api/training/analytics/department`
  - `users`
  - `departments`
  - `user_courses`
  - `quiz_attempts`
  - `training_feedback`

- `GET /api/training/analytics/course`
  - `courses`
  - `user_courses`
  - `training_feedback`

- `GET /api/training/feedback`
  - `training_feedback`
  - `users`
  - `courses`

- `POST /api/training/feedback/analyze`
  - `training_feedback`

- `POST /api/training/reports/generate`
  - `reports`
  - cùng dữ liệu tổng hợp từ các bảng analytics khác

- `GET /api/training/reports`
  - `reports`

- `GET /api/training/reports/:id`
  - `reports`

---

## 10. Ví dụ end-to-end

# Ví dụ 1: User hỏi checklist onboarding

## Frontend gọi
```http
POST /chat/message
Authorization: Bearer user_access_token
```

```json
{
  "conversationId": "conv_001",
  "message": "Tôi còn task onboarding nào chưa làm?"
}
```

## Backend route
- agent: `onboarding_assistant`

## OpenClaw gọi tool
- tool: `get_my_checklist`

## Tool gọi internal API
```http
GET /internal/tools/onboarding/me/checklist
Authorization: Bearer internal_agent_token
X-Agent-Name: onboarding_assistant
X-User-Id: 101
```

## Internal API query DB
- `user_onboarding_tasks`
- `onboarding_tasks`

## Trả kết quả về agent
```json
{
  "success": true,
  "data": [
    {
      "taskId": 2,
      "taskName": "Hoàn thành khóa nội quy bảo mật",
      "status": "pending"
    }
  ]
}
```

## Agent trả lời user
```json
{
  "success": true,
  "data": {
    "conversationId": "conv_001",
    "agentGroup": "onboarding_assistant",
    "content": "Bạn còn 1 task chưa hoàn thành: Hoàn thành khóa nội quy bảo mật."
  }
}
```

---

# Ví dụ 2: User yêu cầu sinh learning path

## Request
```http
POST /api/me/learning-path/generate
Authorization: Bearer user_access_token
```

```json
{
  "targetLevel": "intern",
  "maxCourses": 5,
  "includeMandatoryCourses": true
}
```

## Hệ thống đọc DB
- `users`
- `user_skills`
- `role_skill_requirements`
- `courses`
- `course_skills`

## Response
```json
{
  "success": true,
  "data": {
    "generated": true,
    "learningPath": {
      "name": "Generated Path for User 101",
      "items": [
        {
          "orderNo": 1,
          "courseId": 12,
          "title": "Product Overview"
        },
        {
          "orderNo": 2,
          "courseId": 11,
          "title": "NodeJS Basic"
        }
      ]
    }
  }
}
```

---

## 11. Gợi ý coding cho backend

- Controller chỉ nhận request và trả response
- Service xử lý business logic
- Repository / ORM xử lý truy vấn DB
- Internal tool API phải tách riêng prefix `/internal/tools/*`
- Mọi internal tool API đều cần auth riêng
- Mọi enum/option nên chuẩn hóa thành constant hoặc enum type trong code
- Response format phải thống nhất toàn dự án

---

## 12. Kết luận

Thiết kế đúng của hệ thống là:

- Frontend gọi External API
- Backend route sang agent phù hợp
- Agent gọi tool
- Tool gọi Internal Tool API
- Internal Tool API query DB
- DB là source of truth chính

Không nên:
- cho agent query DB trực tiếp
- cho mọi agent gọi mọi API
- để external và internal API trộn lẫn không có phân tách
