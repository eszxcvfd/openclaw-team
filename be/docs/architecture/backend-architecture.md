# Tài liệu kiến trúc Backend
## Dự án: Backend điều phối AI Agent dùng OpenClaw

## 1. Mục tiêu hệ thống

Backend là trung tâm của toàn bộ hệ thống. Backend không chỉ là API server thông thường mà còn đóng vai trò:

- xác thực người dùng
- phân quyền theo role
- điều phối agent
- tạo context cho agent
- cung cấp API nội bộ để agent gọi qua tool
- ghi log hội thoại và audit
- bảo vệ dữ liệu trước khi agent được phép truy cập

Trong kiến trúc này:

- **Frontend** là nơi user chat
- **Backend** là cổng chính
- **OpenClaw** là engine AI
- **Database** là nơi lưu dữ liệu thật
- **Folder data** là nơi chứa tài liệu tĩnh
- **Folder generated** là nơi chứa file context và file được sinh ra

---

## 2. Kiến trúc phù hợp

Kiến trúc phù hợp nhất cho giai đoạn đầu là:

**Modular Monolith + AI Orchestrator + Tool/API Layer**

Giải thích dễ hiểu:

- chỉ có **1 backend chính**
- bên trong chia thành nhiều module rõ ràng
- backend giữ toàn bộ business logic, auth, RBAC, orchestration
- OpenClaw chỉ xử lý phần AI và tool calling
- không tách microservices quá sớm để tránh rối và khó debug

---

## 3. Thành phần chính

### 3.1 Frontend
Nơi user chat với hệ thống.

Ví dụ:
- web chat nội bộ
- trang admin
- dashboard HR / Training

### 3.2 Backend
Là trung tâm điều phối.

Chức năng chính:
- login / logout / refresh token
- xác thực session
- phân quyền RBAC
- chọn agent phù hợp
- build context cho agent
- gọi OpenClaw
- expose API nội bộ cho tool
- query database
- ghi audit log
- lưu conversation và message

### 3.3 OpenClaw
Là nơi chạy các agent con.

Chức năng:
- nhận request từ backend
- reasoning
- gọi tool được cấp quyền
- trả câu trả lời về backend

### 3.4 Database
Nơi lưu dữ liệu thật của hệ thống.

Khuyến nghị:
- PostgreSQL làm DB chính
- Redis cho cache, queue, rate limit, background job

### 3.5 Data folder
Nơi lưu tài liệu tĩnh:
- handbook
- policy
- FAQ
- nội dung khóa học
- rule KPI
- template report

### 3.6 Generated folder
Nơi lưu file được tạo ra:
- USER.md
- session-context.md
- learning-path.md
- quiz JSON
- report markdown/pdf

---

## 4. Luồng tổng thể

Luồng chuẩn:

1. User chat từ frontend
2. Frontend gửi request lên backend
3. Backend xác thực user
4. Backend kiểm tra role / permission
5. Backend chọn agent phù hợp
6. Backend build context
7. Backend gửi request sang OpenClaw
8. OpenClaw agent xử lý
9. Nếu cần dữ liệu, agent gọi tool
10. Tool gọi API nội bộ của backend
11. Backend query DB hoặc đọc tài liệu cho phép
12. Backend trả dữ liệu về tool
13. Tool trả dữ liệu lại cho agent
14. Agent sinh câu trả lời
15. OpenClaw trả kết quả về backend
16. Backend lưu log / conversation
17. Backend trả response về frontend

---

## 5. Vai trò của Backend Orchestrator

Backend Orchestrator là phần quan trọng nhất.

Nó không phải agent AI, mà là logic điều phối trong backend.

Nhiệm vụ:
- xác định user được dùng nhóm agent nào
- phân loại câu hỏi thuộc nghiệp vụ nào
- route request tới agent tương ứng
- build context phù hợp cho agent
- chặn yêu cầu vượt quyền
- quyết định tool/API nào agent được phép dùng trong phiên hiện tại

Kết luận:
- **agent cha / orchestrator nằm ở backend**
- **agent con / agent thực thi nằm ở OpenClaw**

---

## 6. 3 nhóm agent lớn

### 6.1 Onboarding Assistant
Agent con:
- Employee Guide
- Onboarding Checklist
- New Hire FAQ

Nhiệm vụ:
- giải đáp nhân viên mới
- trả checklist onboarding
- trả policy và FAQ onboarding

### 6.2 Learning & Training Agent
Agent con:
- Training Recommendation
- Learning Path
- Quiz Generator

Nhiệm vụ:
- gợi ý khóa học
- thiết kế lộ trình học
- sinh quiz đào tạo

### 6.3 Training Analytics Agent
Agent con:
- Feedback Analysis
- Progress Tracking
- Training Report

Nhiệm vụ:
- phân tích feedback
- theo dõi tiến độ học
- sinh báo cáo đào tạo

---

## 7. Nguyên tắc bảo mật

### 7.1 User không được chạm trực tiếp OpenClaw
User luôn đi qua backend.

### 7.2 Agent không được tự do gọi tất cả API
Mỗi agent chỉ được gọi các tool/API phù hợp với nhóm nghiệp vụ của nó.

### 7.3 API phải kiểm tra quyền lại ở backend
Dù agent được phép gọi tool, backend API vẫn phải kiểm tra:
- agent nào đang gọi
- user nào đang được phục vụ
- scope của agent
- role của user
- resource ownership

### 7.4 Không cho agent đọc bừa DB hoặc filesystem
Agent chỉ nên lấy dữ liệu qua:
- tool → API backend
- context file được backend tạo sẵn
- tài liệu được mount/cấp quyền rõ ràng

### 7.5 Tài liệu và dữ liệu động phải tách nhau
- dữ liệu thật: DB
- dữ liệu tĩnh: folder data
- context tạm và file sinh ra: folder generated

---

## 8. Kiến trúc module của backend

### 8.1 auth
Chức năng:
- login
- logout
- refresh token
- session validation
- password / SSO integration nếu có

### 8.2 iam
IAM = Identity and Access Management

Chức năng:
- users
- roles
- permissions
- user_roles
- role_permissions
- user_agent_access

### 8.3 chat
Chức năng:
- conversations
- messages
- session metadata
- transcript log

### 8.4 agent_router
Chức năng:
- route user request sang đúng nhóm agent
- kiểm tra user có được dùng agent đó không
- kiểm tra intent / nghiệp vụ

### 8.5 context_builder
Chức năng:
- lấy dữ liệu từ DB
- lấy tài liệu từ folder data
- tạo USER.md
- tạo session-context.md
- lọc tài nguyên theo quyền

### 8.6 tool_gateway
Chức năng:
- đăng ký tool nội bộ
- map tool sang service/API
- giới hạn tool theo agent
- chuẩn hóa request/response tool

### 8.7 openclaw_client
Chức năng:
- gửi request sang OpenClaw
- truyền context
- nhận tool-call/result
- nhận final answer

### 8.8 onboarding
Chức năng nghiệp vụ onboarding:
- onboarding plans
- onboarding tasks
- faq
- contacts
- policies onboarding

### 8.9 training
Chức năng nghiệp vụ training:
- skills
- courses
- learning path
- quiz
- recommendations

### 8.10 analytics
Chức năng nghiệp vụ analytics:
- feedback
- progress
- reports
- KPI snapshots

### 8.11 documents
Chức năng:
- metadata tài liệu
- document permission
- versioning đơn giản nếu cần

### 8.12 jobs
Chức năng:
- background jobs
- generate report
- analyze feedback batch
- rebuild context
- nightly snapshot

---

## 9. Tầng kiến trúc nội bộ

### 9.1 Controller Layer
Nhận HTTP request từ frontend hoặc tool internal route.

### 9.2 Guard / Policy Layer
Kiểm tra:
- authentication
- authorization
- RBAC
- agent access
- document access

### 9.3 Service Layer
Xử lý nghiệp vụ.

### 9.4 Orchestrator Layer
Điều phối AI flow:
- chọn agent
- build context
- gọi openclaw
- gom kết quả

### 9.5 Repository Layer
Làm việc với DB.

### 9.6 Integration Layer
Làm việc với:
- OpenClaw
- Redis
- file system
- queue
- external systems nếu có

---

## 10. Cơ sở dữ liệu

### 10.1 DB chính
Khuyến nghị dùng PostgreSQL.

Lý do:
- dữ liệu có quan hệ rõ
- cần join nhiều bảng
- cần transaction
- cần báo cáo
- dễ quản lý role/permission/document metadata

### 10.2 Redis
Dùng cho:
- cache
- queue
- job scheduling
- rate limit
- distributed lock nếu cần

---

## 11. Dữ liệu trong hệ thống

### 11.1 Dữ liệu thật
Lưu trong DB:
- users
- roles
- permissions
- onboarding
- courses
- quiz
- feedback
- reports metadata
- conversation metadata

### 11.2 Tài liệu tĩnh
Lưu trong `data/`:
- employee-handbook.md
- company-policies.md
- faq.md
- skill-matrix.md
- learning-paths.md
- report-template.md

### 11.3 File sinh ra
Lưu trong `generated/`:
- USER.md
- session-context.md
- learning-path.md
- quiz JSON
- report markdown/pdf

---

## 12. Cách agent dùng API

### 12.1 Nguyên tắc
Agent không gọi DB trực tiếp.

Agent gọi:
- **tool**

Tool sẽ gọi:
- **API backend nội bộ**

API backend sẽ:
- kiểm tra auth nội bộ
- kiểm tra quyền
- query DB
- trả kết quả lại

### 12.2 Chuỗi chuẩn
User → Backend → OpenClaw → Tool → Backend API → DB → Backend API → Tool → OpenClaw → Backend → User

---

## 13. API nhóm Onboarding

Ví dụ API:
- `GET /api/me/profile`
- `GET /api/me/onboarding`
- `GET /api/me/checklist`
- `GET /api/policies?category=onboarding`
- `GET /api/faq?category=onboarding`
- `GET /api/contacts/support`
- `POST /api/me/checklist/:taskId/complete`

Tool tương ứng:
- `get_my_profile`
- `get_my_onboarding`
- `get_my_checklist`
- `get_onboarding_policies`
- `get_onboarding_faq`
- `get_support_contacts`
- `complete_checklist_task`

---

## 14. API nhóm Learning & Training

Ví dụ API:
- `GET /api/me/skills`
- `GET /api/me/courses`
- `GET /api/me/learning-path`
- `GET /api/courses`
- `GET /api/courses/:id`
- `GET /api/me/training-recommendations`
- `POST /api/me/learning-path/generate`
- `POST /api/quiz/generate`
- `POST /api/quiz/submit`
- `GET /api/quiz/:id/result`

Tool tương ứng:
- `get_my_skills`
- `get_my_courses`
- `get_my_learning_path`
- `get_courses`
- `get_course_detail`
- `get_training_recommendations`
- `generate_learning_path`
- `generate_quiz`
- `submit_quiz`
- `get_quiz_result`

---

## 15. API nhóm Analytics

Ví dụ API:
- `GET /api/training/analytics/overview`
- `GET /api/training/analytics/progress`
- `GET /api/training/analytics/department`
- `GET /api/training/analytics/course`
- `GET /api/training/feedback`
- `POST /api/training/feedback/analyze`
- `POST /api/training/reports/generate`
- `GET /api/training/reports`
- `GET /api/training/reports/:id`

Tool tương ứng:
- `get_training_overview`
- `get_training_progress`
- `get_department_training_analytics`
- `get_course_training_analytics`
- `get_training_feedback`
- `analyze_training_feedback`
- `generate_training_report`
- `list_training_reports`
- `get_training_report_detail`

---

## 16. Cấu trúc deploy khuyến nghị

### Giai đoạn đầu
Tối thiểu:
- 1 server frontend + backend
- 1 server OpenClaw
- 1 database PostgreSQL
- 1 Redis

### Giai đoạn mở rộng
Có thể tách:
- backend app
- db
- redis
- openclaw
- worker job

---

## 17. Logging và Audit

Backend phải log ít nhất:
- user nào chat
- agent nào được gọi
- tool nào được gọi
- API nào được gọi
- response time
- error
- permission denied
- report generated
- quiz submitted

Audit log nên có:
- actor
- action
- resource
- timestamp
- result
- metadata

---

## 18. Background jobs

Các việc nên chạy async:
- generate report PDF
- phân tích feedback hàng loạt
- tạo analytics snapshot
- làm sạch generated files
- sync dữ liệu từ hệ khác nếu có
- re-index tài liệu

---

## 19. Công nghệ khuyến nghị

Stack backend phù hợp:
- NestJS
- PostgreSQL
- Prisma
- Redis
- BullMQ
- Docker
- OpenClaw chạy riêng

---

## 20. Kết luận

Kiến trúc backend chốt lại như sau:

- backend là trung tâm
- backend giữ auth, RBAC, orchestration
- OpenClaw chỉ làm AI execution
- agent cha ở backend
- agent con ở OpenClaw
- API được bọc thành tool để agent dùng
- DB là nguồn dữ liệu thật
- file markdown chỉ là context/knowledge, không thay DB
- kiến trúc nên bắt đầu bằng modular monolith
