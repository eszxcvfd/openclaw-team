# Database Overview for Coding Agent

## 1. Mục tiêu database

Database này được thiết kế cho hệ thống:

- Backend xác thực và phân quyền người dùng
- OpenClaw agent gọi tool để lấy dữ liệu qua API backend
- 3 nhóm agent chính:
  - `onboarding`
  - `learning_training`
  - `training_analytics`

Database dùng PostgreSQL, có:

- `UUID` làm khóa chính
- `JSONB` cho context động / generated payload
- schema chính là `app`

---

## 2. Extension và schema

Hệ thống dùng các extension:

- `pgcrypto`: để sinh `gen_random_uuid()`
- `citext`: để email không phân biệt hoa thường

Schema mặc định:

```sql
app
```

Tất cả bảng chính đều nằm trong schema này.

---

## 3. Tư duy kiến trúc dữ liệu

Database chia thành 8 khối:

1. **Core / Auth / RBAC**
2. **Agent / Tool / API Access Control**
3. **Document / Knowledge / Context**
4. **Chat / Conversation**
5. **Onboarding**
6. **Learning / Training**
7. **Analytics / Feedback / Reporting**
8. **Generated / JSONB context support**

Ý nghĩa:

- **Backend** quản lý user, role, permission
- **Agent** không đọc DB trực tiếp, mà gọi **tool**
- **Tool** map sang **API backend**
- **API backend** query DB này

---

## 4. Nhóm bảng Core / Auth / RBAC

### `departments`
Danh mục phòng ban.

### `positions`
Danh mục chức danh / vị trí.

### `users`
Bảng người dùng trung tâm.

Chứa:
- email
- password hash
- tên
- phòng ban
- vị trí
- manager
- ngày vào làm
- trạng thái user

Quan hệ chính:
- `department_id -> departments.id`
- `position_id -> positions.id`
- `manager_id -> users.id`

### `roles`
Danh mục vai trò.

Ví dụ:
- admin
- hr
- manager
- employee

### `permissions`
Danh sách quyền chi tiết.

Ví dụ:
- xem report
- quản lý onboarding
- tạo learning path
- gọi analytics API

### `role_permissions`
Map nhiều-nhiều giữa role và permission.

### `user_roles`
Map nhiều-nhiều giữa user và role.

### `auth_sessions`
Phiên đăng nhập / refresh token.

Dùng cho:
- quản lý session
- revoke token
- audit đăng nhập

---

## 5. Nhóm bảng Agent / Tool / API Access

Đây là phần rất quan trọng để nối backend với OpenClaw.

### `agent_groups`
3 agent lớn của hệ thống.

Seed sẵn:
- `onboarding`
- `learning_training`
- `training_analytics`

### `agent_submodules`
Các chức năng con của từng agent lớn.

Ví dụ:
- employee guide
- checklist
- training recommendation
- learning path
- quiz generator
- feedback analysis

### `user_agent_access`
User nào được phép dùng agent group nào.

### `backend_api_catalog`
Danh mục API backend.

Ví dụ:
- `GET /api/me/profile`
- `GET /api/me/checklist`
- `POST /api/quiz/generate`

### `tools`
Danh mục tool mà agent có thể gọi.

Ý nghĩa:
- mỗi tool có thể map tới 1 API backend
- tool có `input_schema` và `output_schema` kiểu `JSONB`

Ví dụ:
- `get_my_profile`
- `get_my_checklist`
- `generate_learning_path`

### `agent_group_tools`
Quy định agent group nào được phép dùng tool nào.

Đây là lớp chặn rất quan trọng:
- onboarding agent chỉ dùng tool onboarding
- learning agent chỉ dùng tool training
- analytics agent chỉ dùng tool analytics

### `service_tokens`
Token nội bộ cho agent/tool/backend service.

Nên dùng để:
- xác thực request nội bộ giữa OpenClaw và backend
- giới hạn scope theo từng agent group

### `tool_call_logs`
Log toàn bộ lần gọi tool/API.

Dùng cho:
- audit
- debug
- tracing
- kiểm tra agent nào đã gọi API nào
- request/response payload ra sao

---

## 6. Nhóm bảng Document / Knowledge / Context

### `documents`
Metadata và nội dung tài liệu.

Có thể lưu:
- tài liệu file
- tài liệu inline
- JSON content
- generated document

Các trường quan trọng:
- `category`
- `group_code`
- `source_type`
- `file_path`
- `content_text`
- `content_json`

### `document_permissions`
Role nào được xem tài liệu nào.

### `user_contexts`
Context tổng hợp theo user, lưu bằng `JSONB`.

Dùng để lưu:
- hồ sơ user rút gọn
- quyền tổng hợp
- trạng thái học / onboarding
- allowed resources

### `session_contexts`
Context theo phiên chat / session.

Dùng khi mỗi phiên cần context riêng:
- intent hiện tại
- agent hiện tại
- tài nguyên được phép dùng trong phiên
- trạng thái xử lý

### `generated_artifacts`
Lưu các output sinh tự động bằng `JSONB` hoặc file path.

Ví dụ:
- learning path đã sinh
- quiz đã sinh
- report summary
- onboarding summary

---

## 7. Nhóm bảng Chat / Conversation

### `conversations`
Thông tin cuộc trò chuyện.

Có:
- user nào chat
- agent group nào xử lý
- channel gì
- session key
- trạng thái open/closed

### `messages`
Tin nhắn bên trong conversation.

Các loại sender:
- `user`
- `assistant`
- `system`
- `tool`

### Liên hệ với `tool_call_logs`
`tool_call_logs` có thể tham chiếu tới:
- `conversation_id`
- `message_id`

Mục đích:
- biết tool nào được gọi ở message nào
- truy vết đầy đủ luồng chat

---

## 8. Nhóm bảng Onboarding

### `onboarding_plans`
Kế hoạch onboarding mẫu theo phòng ban / vị trí.

### `onboarding_tasks`
Task nằm trong một onboarding plan.

Có:
- mã task
- tên task
- mô tả
- thứ tự
- ngày đến hạn tương đối
- có bắt buộc không
- có gắn document hướng dẫn không

### `user_onboarding_tasks`
Task onboarding thực tế của từng user.

Trạng thái:
- `pending`
- `in_progress`
- `completed`
- `skipped`
- `blocked`

### `faq_items`
FAQ nội bộ.

### `contacts_directory`
Danh bạ hỗ trợ nội bộ.

### `company_policies`
Metadata policy công ty, có liên kết tới `documents`.

---

## 9. Nhóm bảng Learning / Training

### `skills`
Danh mục kỹ năng.

### `user_skills`
Kỹ năng hiện tại của user.

### `role_skill_requirements`
Kỹ năng yêu cầu cho từng position.

Dùng để:
- xác định skill gap
- gợi ý course phù hợp

### `courses`
Danh mục khóa học.

Có:
- mã course
- tiêu đề
- mô tả
- level
- thời lượng
- format
- document nội dung khóa học

### `course_skills`
Course phát triển kỹ năng nào.

### `course_prerequisites`
Điều kiện tiên quyết giữa các khóa học.

### `user_courses`
Tiến độ học của từng user.

Trạng thái:
- `not_started`
- `in_progress`
- `completed`
- `failed`
- `cancelled`

### `learning_paths`
Lộ trình học mẫu.

### `learning_path_items`
Các bước trong lộ trình học.

### `user_learning_paths`
Lộ trình học sinh riêng cho từng user.

Dùng `generated_payload JSONB` để lưu lộ trình đã cá nhân hóa.

### `quiz_templates`
Mẫu quiz.

### `quiz_questions`
Ngân hàng câu hỏi.

### `quiz_attempts`
Lịch sử làm quiz.

Lưu:
- câu trả lời nộp lên
- điểm
- thời gian làm bài

---

## 10. Nhóm bảng Analytics / Feedback / Reporting

### `training_sessions`
Phiên / lớp đào tạo.

### `training_attendance`
Điểm danh user trong phiên đào tạo.

### `training_feedback`
Feedback sau đào tạo.

Có:
- rating
- comment
- sentiment label
- topics JSON

### `reports`
Báo cáo được sinh ra.

Lưu:
- loại report
- khoảng thời gian
- người tạo
- summary JSON
- đường dẫn file

### `analytics_snapshots`
Snapshot KPI theo ngày / phòng ban / vị trí.

Dùng cho dashboard nhanh.

Ví dụ:
- completion rate
- average score
- satisfaction score
- dropout rate

---

## 11. Quan hệ nghiệp vụ chính

### User và phân quyền
- 1 user có thể có nhiều role
- 1 role có nhiều permission
- 1 user có thể được cấp quyền dùng nhiều agent group

### Agent và tool
- 1 agent group có nhiều tool
- 1 tool có thể map tới 1 backend API
- tool call được log lại đầy đủ

### User và onboarding
- 1 user nhận nhiều onboarding task
- task đến từ onboarding plan
- plan có thể phụ thuộc theo department / position

### User và training
- 1 user có nhiều skill
- 1 position yêu cầu nhiều skill
- 1 course hỗ trợ nhiều skill
- 1 user có nhiều course progress
- 1 user có thể có learning path riêng

### User và analytics
- user có quiz attempts
- user có attendance
- user có feedback
- report có thể tổng hợp từ nhiều bảng training

---

## 12. Vai trò của JSONB trong schema này

Database này cố ý dùng `JSONB` ở vài nơi thay vì tạo quá nhiều bảng nhỏ.

### Dùng `JSONB` khi:
- context thay đổi linh hoạt
- payload output của agent không cố định
- cần lưu request/response tool
- cần snapshot hoặc generated object

### Các bảng dùng JSONB nổi bật:
- `tools.input_schema`
- `tools.output_schema`
- `service_tokens.scopes`
- `tool_call_logs.request_payload`
- `tool_call_logs.response_payload`
- `documents.content_json`
- `user_contexts.context_json`
- `session_contexts.context_json`
- `generated_artifacts.payload_json`
- `user_learning_paths.generated_payload`
- `quiz_questions.options_json`
- `quiz_questions.answer_key_json`
- `quiz_attempts.submitted_answers`
- `training_feedback.topics_json`
- `reports.summary_json`

### Ghi chú cho coding agent
Không nên lạm dụng JSONB cho mọi thứ.
Schema hiện tại đã chia rõ:
- dữ liệu quan hệ cứng -> bảng thường
- dữ liệu linh hoạt -> JSONB

---

## 13. Cách backend nên dùng database này

Luồng đúng:

1. User đăng nhập vào backend
2. Backend xác định:
   - user là ai
   - role gì
   - được dùng agent nào
3. Backend route sang agent group phù hợp
4. OpenClaw agent gọi tool
5. Tool gọi API backend
6. Backend API query DB này
7. Trả kết quả cho agent
8. Agent trả lời user

### Điểm quan trọng
Agent không nên đọc DB trực tiếp.
DB này được thiết kế để **backend làm cổng kiểm soát chính**.

---

## 14. Cách coding agent nên hiểu các nhóm API từ DB

### Onboarding APIs thường sẽ đọc
- `users`
- `onboarding_plans`
- `onboarding_tasks`
- `user_onboarding_tasks`
- `faq_items`
- `contacts_directory`
- `company_policies`
- `documents`

### Learning/Training APIs thường sẽ đọc
- `users`
- `user_skills`
- `role_skill_requirements`
- `courses`
- `course_skills`
- `course_prerequisites`
- `user_courses`
- `learning_paths`
- `learning_path_items`
- `user_learning_paths`
- `quiz_templates`
- `quiz_questions`
- `quiz_attempts`

### Analytics APIs thường sẽ đọc
- `user_courses`
- `quiz_attempts`
- `training_sessions`
- `training_attendance`
- `training_feedback`
- `reports`
- `analytics_snapshots`
- `departments`
- `positions`

---

## 15. Seed mặc định đã có

Schema có seed sẵn 3 dòng trong `agent_groups`:

- `onboarding`
- `learning_training`
- `training_analytics`

Coding agent có thể giả định 3 agent group này tồn tại ngay sau khi migrate schema.

---

## 16. Index và hiệu năng

Schema đã có index cho các điểm quan trọng:

- foreign key hay dùng
- trạng thái user / course / onboarding
- conversation/message lookup
- tool logs
- feedback / reports
- các cột `JSONB` quan trọng bằng `GIN`

Điều này cho phép:
- query theo user nhanh hơn
- lọc context JSONB
- search payload và metadata hợp lý hơn

---

## 17. Trigger `updated_at`

Nhiều bảng có trigger tự động cập nhật `updated_at` thông qua function:

```sql
set_updated_at()
```

Coding agent nên biết:
- không cần tự set `updated_at` thủ công trong hầu hết case update
- DB sẽ tự xử lý

---

## 18. Gợi ý triển khai cho coding agent

### Auth layer
Dùng:
- `users`
- `roles`
- `permissions`
- `role_permissions`
- `user_roles`
- `auth_sessions`

### Agent access layer
Dùng:
- `agent_groups`
- `user_agent_access`
- `tools`
- `agent_group_tools`
- `backend_api_catalog`
- `service_tokens`

### Knowledge/context layer
Dùng:
- `documents`
- `document_permissions`
- `user_contexts`
- `session_contexts`
- `generated_artifacts`

### Business layer
Dùng:
- onboarding tables
- training tables
- analytics tables

### Audit/logging layer
Dùng:
- `conversations`
- `messages`
- `tool_call_logs`

---

## 19. Những điểm coding agent cần tôn trọng

1. **Mọi bảng đều ở schema `app`**
2. **UUID là khóa chính chuẩn**
3. **Email dùng `CITEXT`**
4. **Không để agent gọi API vượt ngoài `agent_group_tools`**
5. **Mọi API nội bộ nên kiểm tra lại quyền từ backend**
6. **Dùng `JSONB` cho context/payload động, không phá chuẩn relational hiện tại**
7. **Ưu tiên soft-control ở backend, không để OpenClaw tự quyết định quyền nghiệp vụ**

---

## 20. Tóm tắt rất ngắn cho coding agent

Đây là một PostgreSQL schema cho hệ thống AI agent doanh nghiệp, nơi:

- backend quản lý auth và RBAC
- OpenClaw agent gọi tool
- tool map tới backend API
- backend API query database
- database chia thành:
  - core auth/rbac
  - agent/tool/api access
  - documents/context
  - conversations
  - onboarding
  - learning/training
  - analytics/reporting

Mục tiêu chính của schema là:
- phân quyền rõ
- dễ audit
- hỗ trợ nhiều agent group
- hỗ trợ dữ liệu động qua JSONB
- phù hợp cho backend trung gian kiểm soát toàn bộ hệ thống
