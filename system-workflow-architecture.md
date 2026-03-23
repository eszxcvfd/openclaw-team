# TÀI LIỆU WORKFLOW TOÀN BỘ HỆ THỐNG
## Hệ thống Backend + OpenClaw Multi-Agent cho Onboarding / Training / Analytics

## 1. Mục tiêu tài liệu

Tài liệu này mô tả đầy đủ workflow của toàn bộ hệ thống, các layer chính, trách nhiệm của từng layer, luồng dữ liệu, luồng phân quyền, cách OpenClaw được sử dụng, và cách backend cần phối hợp để hệ thống hoạt động ổn định.

Tài liệu này dùng để:
- thống nhất tư duy kiến trúc
- giúp agent code hiểu đúng luồng
- làm nền cho việc chia module backend
- tránh nhầm vai trò giữa backend và OpenClaw

---

## 2. Kết luận kiến trúc tổng quát

Hệ thống được chốt theo nguyên tắc:

- User **không đi trực tiếp** vào OpenClaw
- User luôn đi qua **Frontend / Backend của hệ thống**
- Backend là nơi:
  - đăng nhập
  - xác thực
  - phân quyền
  - chọn agent
  - kiểm soát dữ liệu
  - log và audit
- OpenClaw chỉ là **AI Agent Engine**
- Dữ liệu thật nằm ở:
  - DB tổng
  - folder tài liệu `data/`
  - API nội bộ của backend

Công thức tổng quát:

**User → Frontend → Backend → OpenClaw Agent → Tool → Backend API → DB / Data → OpenClaw → Backend → Frontend → User**

---

## 3. Các layer của toàn bộ hệ thống

# Layer 1. Client Layer

## Thành phần
- Web frontend / chat UI nội bộ
- Có thể mở rộng sang mobile app sau này

## Vai trò
- hiển thị giao diện chat
- đăng nhập
- gửi câu hỏi của user lên backend
- hiển thị câu trả lời của hệ thống
- hiển thị lịch sử hội thoại
- hiển thị trạng thái xử lý

## Không được làm
- không tự phân quyền
- không gọi OpenClaw trực tiếp
- không gọi DB trực tiếp
- không giữ logic nghiệp vụ quan trọng

---

# Layer 2. API Gateway / Main Backend Layer

Đây là layer quan trọng nhất.

## Thành phần
- Auth module
- RBAC / Permission module
- Agent Routing module
- Conversation module
- Data access / Business API module
- Audit / Logging module
- Context Builder module

## Vai trò
Backend là trung tâm điều phối toàn bộ hệ thống.

Backend phải chịu trách nhiệm:

### 2.1 Xác thực
- đăng nhập user
- quản lý access token / refresh token / session
- biết user là ai

### 2.2 Phân quyền
- user thuộc role nào
- user được dùng agent nhóm nào
- user được truy cập tài liệu nào
- user được thao tác dữ liệu nào

### 2.3 Điều phối agent
- dựa trên role + intent + policy để chọn đúng agent lớn
- dùng cơ chế hybrid:
  - match `intent` cố định / rule-based trước
  - nếu mơ hồ thì fallback sang Google model classifier ở backend
- Google classifier dùng `GEMINI_API_KEY` (cho phép `GOOGLE_API_KEY` làm fallback env)
- chỉ được classify trong tập agent mà user đã được phép dùng
- ví dụ:
  - Onboarding Assistant
  - Learning & Training Agent
  - Training Analytics Agent

### 2.4 Quản lý hội thoại
- tạo conversation
- lưu message
- map user với agent đã dùng
- giữ session metadata

### 2.5 Dựng context cho agent
- lấy profile user
- lấy quyền hiện tại
- lấy tài liệu / dữ liệu liên quan
- tạo context gọn cho OpenClaw

### 2.6 Expose Business API cho tool
Backend là nơi cung cấp các API nội bộ để OpenClaw gọi thông qua tool:
- get_my_profile
- get_my_checklist
- get_my_courses
- generate_learning_path
- get_training_feedback
- generate_training_report

### 2.7 Logging / Audit
- ghi log request
- ghi log response
- ghi log tool calls
- theo dõi agent nào đã gọi API nào

## Nguyên tắc quan trọng
Backend mới là lớp **security boundary** chính của hệ thống.

---

# Layer 3. OpenClaw Agent Layer

## Thành phần
- OpenClaw server
- các agent lớn
- các tool được cấp quyền
- session / workspace / memory của agent

## Vai trò
OpenClaw chỉ làm đúng các việc sau:
- reasoning
- đọc context
- gọi tool đúng quyền
- tổng hợp dữ liệu
- viết câu trả lời

## Không làm
- không tự xử lý login doanh nghiệp
- không làm RBAC chính
- không tự có toàn quyền đọc DB
- không tự được gọi mọi API

## Tổ chức agent
Hệ thống chốt 3 agent lớn:

### Agent 1. Onboarding Assistant
Chức năng con:
- Employee Guide
- Onboarding Checklist
- New Hire FAQ

### Agent 2. Learning & Training Agent
Chức năng con:
- Training Recommendation
- Learning Path
- Quiz Generator

### Agent 3. Training Analytics Agent
Chức năng con:
- Feedback Analysis
- Progress Tracking
- Training Report

## Quy tắc dùng tool
- mỗi agent chỉ được dùng đúng bộ tool của mình
- tool allow/deny phải cấu hình rõ
- không được cấp tool dư thừa

---

# Layer 4. Tool Layer

Đây là lớp trung gian giữa agent và backend API.

## Khái niệm
Tool là function mà agent có thể gọi khi cần dữ liệu hoặc cần thao tác nghiệp vụ.

Ví dụ:
- `get_my_profile`
- `get_my_checklist`
- `get_my_skills`
- `generate_quiz`
- `get_department_training_report`

## Cách hoạt động
- agent chọn tool
- tool nhận tham số
- tool gọi API backend nội bộ
- nhận dữ liệu trả về
- trả kết quả lại cho agent

## Vai trò
- chuẩn hóa cách agent gọi nghiệp vụ
- chặn agent gọi lung tung
- dễ kiểm soát quyền
- dễ log và monitor

## Quy tắc bảo mật
- tool nào không được cấp cho agent thì agent không được gọi
- backend API vẫn phải kiểm tra lại agent token + user context + scope

---

# Layer 5. Business API Layer

Đây là các API nội bộ do backend cung cấp.

## Vai trò
- là cổng chính để agent lấy dữ liệu thật
- là nơi query DB
- là nơi kiểm tra permission thật sự
- là nơi áp logic nghiệp vụ

## Không nên
- không để OpenClaw query DB trực tiếp nếu không thật sự cần
- không để tool bypass API

---

# Layer 6. Data Layer

## Thành phần
- Database tổng
- Folder `data/` chứa tài liệu gốc
- Folder `generated/` chứa file context / file sinh ra

### 6.1 Database tổng
Lưu dữ liệu sống và dữ liệu nghiệp vụ.

Nhóm bảng chính:
- users
- roles
- permissions
- user_roles
- departments
- positions
- user_agent_access
- conversations
- messages
- documents
- document_permissions

Nhóm onboarding:
- onboarding_plans
- onboarding_tasks
- user_onboarding_tasks
- faq_items
- contacts_directory
- company_policies

Nhóm learning & training:
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

Nhóm analytics:
- training_feedback
- training_sessions
- training_attendance
- reports
- analytics_snapshots

### 6.2 Folder `data/`
Chứa tài liệu tĩnh / bán tĩnh.

Ví dụ:
- data/common/company-overview.md
- data/onboarding/employee-handbook.md
- data/onboarding/faq.md
- data/training/course-catalog.md
- data/training/skill-matrix.md
- data/analytics/report-template.md
- data/analytics/kpi-rules.md

### 6.3 Folder `generated/`
Chứa dữ liệu sinh ra theo user hoặc session.

Ví dụ:
- generated/context/users/{user_id}/USER.md
- generated/context/sessions/{session_id}/session-context.md
- generated/onboarding/{user_id}/onboarding-summary.md
- generated/training/{user_id}/learning-path.md
- generated/training/{user_id}/quiz-{quiz_id}.json
- generated/analytics/reports/{report_id}.md

---

## 4. Workflow tổng thể của hệ thống

# Bước 1. User đăng nhập
User đăng nhập vào frontend.

Frontend gọi backend:
- verify tài khoản
- nhận access token / refresh token
- tạo session đăng nhập

Backend lấy thông tin:
- user profile
- role
- department
- position
- agent access
- document permissions

# Bước 2. User gửi câu hỏi
Ví dụ user hỏi:
- “Hôm nay tôi còn task onboarding nào chưa làm?”
- “Tôi nên học khóa nào trước?”
- “Cho tôi báo cáo đào tạo phòng kỹ thuật”

Frontend gửi message lên backend.

# Bước 3. Backend phân tích request
Backend làm các việc:
- xác thực token
- xác định user hiện tại
- kiểm tra quyền
- xác định intent sơ bộ theo cơ chế hybrid:
  - classifier rule-based với tập `intent` cố định
  - nếu không đủ rõ thì gọi Google model classifier ở backend
- map sang agent phù hợp trong tập agent user được phép dùng

Ví dụ:
- onboarding question → Onboarding Assistant
- learning question → Learning & Training Agent
- analytics/report question → Training Analytics Agent

# Bước 4. Backend dựng context
Backend query các nguồn cần thiết:
- DB tổng
- tài liệu gốc trong `data/`
- dữ liệu session hiện tại
- permission của user

Sau đó backend tạo:
- user context
- allowed resources
- conversation metadata
- session context

# Bước 5. Backend gọi OpenClaw
Backend gửi sang OpenClaw:
- agent name
- user context
- session id / conversation id
- message của user
- metadata quyền

# Bước 6. OpenClaw xử lý
Agent đọc:
- prompt hệ thống
- context backend gửi
- file kiến thức cần thiết
- memory / session hiện tại

Nếu chưa đủ dữ liệu, agent sẽ gọi tool.

# Bước 7. Tool gọi backend API
Ví dụ:
- `get_my_checklist`
- `get_my_courses`
- `generate_learning_path`
- `get_training_feedback`

OpenClaw runtime gọi tool.
Tool gọi backend API nội bộ.

# Bước 8. Backend API xử lý tool request
Backend API phải:
- xác thực token của agent/tool
- xác định agent nào đang gọi
- xác định user context nào đang được phục vụ
- kiểm tra scope
- query DB
- lọc dữ liệu theo quyền
- trả kết quả về tool

# Bước 9. Agent tổng hợp câu trả lời
Agent nhận dữ liệu từ tool:
- hiểu nội dung
- suy luận
- tạo câu trả lời cuối cùng

# Bước 10. Trả kết quả về user
OpenClaw trả response về backend.
Backend:
- log hội thoại
- log tool calls
- có thể format lại response
- trả về frontend

Frontend hiển thị cho user.

---

## 5. Workflow theo từng nhóm agent

# 5.1 Onboarding Assistant

## Input thường gặp
- hỏi về quy trình ngày đầu
- hỏi checklist onboarding
- hỏi policy nội bộ
- hỏi người liên hệ hỗ trợ

## Nguồn dữ liệu
- users
- onboarding_plans
- onboarding_tasks
- user_onboarding_tasks
- faq_items
- contacts_directory
- company_policies
- data/onboarding/*

## Tool/API chính
- get_my_profile
- get_my_onboarding
- get_my_checklist
- get_onboarding_faq
- get_support_contacts

## Output
- checklist còn thiếu
- hướng dẫn onboarding
- câu trả lời FAQ
- danh sách liên hệ hỗ trợ

---

# 5.2 Learning & Training Agent

## Input thường gặp
- nên học khóa nào
- lộ trình học là gì
- sinh quiz
- xem tiến độ học cá nhân

## Nguồn dữ liệu
- users
- skills
- user_skills
- role_skill_requirements
- courses
- user_courses
- learning_paths
- learning_path_items
- quiz_templates
- quiz_questions
- data/training/*

## Tool/API chính
- get_my_skills
- get_my_courses
- get_my_learning_path
- get_training_recommendations
- generate_learning_path
- generate_quiz
- submit_quiz

## Output
- khóa học đề xuất
- learning path cá nhân hóa
- bài quiz
- kết quả quiz

---

# 5.3 Training Analytics Agent

## Input thường gặp
- báo cáo tiến độ đào tạo
- phân tích feedback
- report theo phòng ban
- overview KPI đào tạo

## Nguồn dữ liệu
- user_courses
- quiz_attempts
- training_feedback
- training_sessions
- training_attendance
- reports
- analytics_snapshots
- data/analytics/*

## Tool/API chính
- get_training_overview
- get_training_progress_by_user
- get_training_progress_by_department
- get_training_feedback
- analyze_training_feedback
- generate_training_report

## Output
- tổng quan đào tạo
- báo cáo phòng ban
- sentiment feedback
- file report

---

## 6. Phân quyền và bảo mật

# 6.1 Nguyên tắc
- user không chạm trực tiếp OpenClaw
- OpenClaw không phải lớp security chính
- backend là nơi enforce permission thật sự

# 6.2 Quyền của user
Backend quyết định:
- user được gọi agent nào
- user được thấy tài liệu nào
- user được thao tác dữ liệu nào

# 6.3 Quyền của agent
OpenClaw quyết định:
- agent nào được dùng tool nào

# 6.4 Quyền của API
Backend API quyết định:
- request của tool có hợp lệ không
- agent token có đúng không
- user context có đúng không
- scope có hợp lệ không

# 6.5 Nguyên tắc 2 lớp chặn
Một API chỉ được gọi thành công khi:
- OpenClaw cho agent dùng tool đó
- Backend API xác nhận agent + user + scope hợp lệ

---

## 7. Tại sao không cho agent query DB trực tiếp

Không nên để agent query DB trực tiếp vì:
- khó phân quyền chi tiết
- khó log
- khó chặn truy cập sai
- logic nghiệp vụ bị phân tán
- khó bảo trì
- tăng rủi ro lộ dữ liệu

Thiết kế đúng là:
**Agent → Tool → Backend API → DB**

---

## 8. Tổ chức thư mục ở mức hệ thống

```text
project-root/
  frontend/
  backend/
  openclaw/
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

## 9. Triển khai hạ tầng

## Tối thiểu
- 1 server: frontend + backend
- 1 server: OpenClaw
- 1 database server riêng hoặc gộp tạm với backend giai đoạn đầu

## Khuyến nghị khởi đầu
- Server A: frontend + backend + internal APIs
- Server B: OpenClaw
- Server C: PostgreSQL

---

## 10. Kết luận kiến trúc

Hệ thống này phải được hiểu theo đúng 1 câu:

**Backend là cổng xác thực + phân quyền + điều phối. OpenClaw là bộ não AI. Dữ liệu thật nằm ở DB, data folder và backend APIs.**

Điểm mấu chốt để hệ thống ổn định:
- không cho user đi thẳng vào OpenClaw
- không cho agent gọi mọi API
- không cho agent query DB trực tiếp
- mọi quyền thật sự phải nằm ở backend
- OpenClaw chỉ được dùng như worker AI có kiểm soát
