# PLAN

## 1) Chuẩn hóa ý tưởng của bạn thành kiến trúc rõ ràng

### 1.1. Phạm vi chức năng chỉ lấy 6-10

Theo ảnh bạn gửi, nhóm này là:

6. **Employee Guide Agent** - chatbot giải đáp thắc mắc cho nhân viên mới
7. **Training Recommendation Agent** - gợi ý khóa học phù hợp năng lực
8. **Learning Path Agent** - thiết kế lộ trình học cá nhân hóa
9. **Quiz Generator Agent** - tự động tạo bài kiểm tra đào tạo
10. **Feedback Analysis Agent** - phân tích phản hồi đào tạo

### 1.2. Kiến trúc mục tiêu

Tôi đề xuất mô hình như sau:

```text
[Frontend Web/App]
  |-- UI API --> [Backend]
  |               |-- Auth/RBAC
  |               |-- Employee Service
  |               |-- Learning Catalog Service
  |               |-- Recommendation Service
  |               |-- Learning Path Service
  |               |-- Quiz Service
  |               |-- Feedback Analytics Service
  |               |-- Knowledge/RAG Service
  |               \-- Audit Log / Monitoring
  |
  \-- Chat API --> [OpenClaw]
                  |-- Orchestrator
                  |-- Context Builder
                  |-- Agent Registry
                  |-- Subagents (6-10)
                  \-- Tool Gateway / Tool Policy
                              |
                              \--> gọi các API được phép từ Backend
```

### 1.3. Phân vai rõ ràng

#### Frontend

- Hiển thị chat, dashboard, danh sách khóa học, learning path, quiz, feedback report
- Gọi BE để lấy dữ liệu UI
- Gọi OpenClaw để chat/nhờ agent xử lý

#### Backend

- Nơi giữ:
  - nghiệp vụ thật
  - dữ liệu thật
  - permission thật
  - audit log thật
- Backend không chỉ "trả API cho FE", mà còn nên có **Tool/API dành riêng cho Agent**

#### OpenClaw

- Không nên là nơi giữ logic nghiệp vụ chính
- Nhiệm vụ đúng nên là:
  - hiểu ý định người dùng
  - chọn subagent phù hợp
  - gom context
  - gọi tool/API được phép
  - tổng hợp câu trả lời
  - fallback/escalation nếu không chắc

---

## 2) Các điểm chưa hợp lý hoặc cần chỉnh

Đây là phần quan trọng nhất, vì ý tưởng của bạn đang đúng hướng nhưng có vài chỗ cần siết lại.

### 2.1. "Subagent mới có quyền gọi API hệ thống" là đúng, nhưng chưa đủ an toàn

Điểm tốt:

- FE không chạm thẳng logic agent
- Orchestrator không gọi bừa tất cả API

Điểm cần sửa:

- Không nên để subagent gọi trực tiếp toàn bộ API backend
- Nên có một lớp **Tool Gateway / Tool Policy Layer**

#### Nên đổi thành

- Subagent chỉ được gọi **tool đã whitelist**
- Mỗi agent có danh sách tool riêng
- Mỗi tool có schema input/output rõ ràng
- Mỗi lần gọi tool đều log lại:
  - ai gọi
  - lúc nào
  - input gì
  - output gì
  - confidence / trace

Ví dụ:

- Employee Guide Agent chỉ được dùng:
  - `get_employee_profile`
  - `get_onboarding_checklist`
  - `search_policy_docs`
  - `get_onboarding_schedule`
- Không được quyền dùng tool của Quiz hay Feedback

### 2.2. "OpenClaw chỉ trả lời từ API được phép" là đúng, nhưng nếu hiểu quá cứng thì sẽ thiếu

Vấn đề:

- Chức năng 6 và 10 rất hay cần dữ liệu từ tài liệu, policy, handbook, FAQ, phản hồi text tự do
- Những thứ này không phải lúc nào cũng là API cấu trúc

#### Cách sửa hợp lý

Vẫn giữ nguyên nguyên tắc "chỉ dùng nguồn được phép", nhưng coi các nguồn sau cũng là tool/API hợp lệ:

- `search_policy_docs`
- `search_training_materials`
- `get_feedback_corpus`
- `retrieve_course_content_chunks`

Tức là:

- agent **không đọc lung tung**
- agent chỉ đọc qua **RAG/Knowledge API đã được backend cấp quyền**

### 2.3. Orchestrator chỉ "nghe và gọi subagent" là hơi mỏng

Nếu orchestrator chỉ router đơn thuần, sau này bạn sẽ bị lặp logic ở từng subagent.

#### Orchestrator nên có ít nhất 5 trách nhiệm

1. Xác định intent
2. Chọn subagent
3. Build context chung
4. Enforce policy
5. Hợp nhất response + fallback

Không nên để orchestrator làm business logic, nhưng cũng không nên quá "ngu".

### 2.4. Recommendation và Learning Path không nên để LLM quyết định toàn bộ

Đây là lỗi rất thường gặp.

#### Không hợp lý nếu

- LLM tự suy ra ai nên học gì, học trước gì, không có rule validation

#### Nên làm

- Backend giữ các ràng buộc cứng:
  - khóa nào bắt buộc
  - prerequisite
  - role-based learning
  - giới hạn thời lượng
  - trạng thái hoàn thành
- LLM chỉ:
  - diễn giải
  - cá nhân hóa lời giải thích
  - sắp xếp, đề xuất theo context mềm

### 2.5. Quiz Generator nếu chỉ sinh bằng LLM thì dễ sai đáp án

Điểm này cần chặn ngay từ thiết kế.

#### Bắt buộc nên có

- grounding từ tài liệu đào tạo
- validator kiểm tra:
  - câu hỏi có bám nội dung nguồn không
  - đáp án đúng có nhất quán không
  - có trùng lặp không
  - có quá mơ hồ không

### 2.6. Feedback Analysis liên quan dữ liệu nhạy cảm

Nếu phân tích phản hồi nhân viên, cần chú ý:

- ẩn danh
- chỉ hiển thị aggregate nếu sample đủ lớn
- không để agent suy diễn đánh giá cá nhân khi chưa đủ căn cứ

---

## 3) Plan chi tiết cho dự án 6-10

### 3.1. Mục tiêu sản phẩm

#### Mục tiêu business

- Tăng tốc onboarding nhân viên mới
- Cá nhân hóa đào tạo
- Tự động hóa xây learning path
- Giảm công sức tạo quiz
- Tự động đọc và tổng hợp feedback đào tạo

#### Người dùng chính

1. **Nhân viên mới**
2. **HR/L&D Admin**
3. **Manager**
4. **Trainer/Instructor**

### 3.2. Domain model tối thiểu

Bạn nên chuẩn hóa trước các entity sau trong backend:

- `Employee`
- `Role`
- `Department`
- `OnboardingChecklist`
- `Course`
- `CourseModule`
- `CoursePrerequisite`
- `TrainingHistory`
- `CompetencyProfile`
- `LearningPath`
- `LearningPathItem`
- `Quiz`
- `QuizQuestion`
- `QuizAttempt`
- `TrainingFeedback`
- `FeedbackTheme`
- `AgentAuditLog`

### 3.3. Thiết kế OpenClaw

#### 3.3.1. Orchestrator

##### Input

- user message
- user id
- role
- current screen/context từ FE
- session history

##### Output

- chọn agent nào
- gọi tool nào
- trả câu trả lời dạng hội thoại hoặc action

##### Nhiệm vụ

- intent classification
- route sang 1 trong 5 agent
- context builder
- policy check
- fallback/handoff

#### 3.3.2. Subagents

- `employee_guide_agent`
- `training_recommendation_agent`
- `learning_path_agent`
- `quiz_generator_agent`
- `feedback_analysis_agent`

#### 3.3.3. Tool Gateway

Mỗi tool cần có:

- tên
- schema input
- schema output
- timeout
- retry policy
- required permission
- audit enabled

### 3.4. Plan chức năng theo từng agent

#### 6) Employee Guide Agent

##### Mục tiêu

Trả lời câu hỏi của nhân viên mới về onboarding, policy, lịch trình, checklist, công cụ cần dùng, khóa học bắt buộc.

##### Use cases chính

- "Ngày đầu tiên tôi cần làm gì?"
- "Checklist onboarding của tôi còn thiếu gì?"
- "Tôi cần học những khóa nào trong tuần đầu?"
- "Chính sách nghỉ phép ở đâu?"
- "Laptop/account của tôi đã được cấp chưa?"

##### Luồng xử lý

1. FE gửi câu hỏi lên OpenClaw
2. Orchestrator nhận diện intent là onboarding Q&A
3. Build context:
   - user profile
   - phòng ban
   - vị trí
   - onboarding stage
4. Gọi Employee Guide Agent
5. Agent dùng tool được phép
6. Trả lời có cấu trúc + nguồn + action tiếp theo

##### Tools/API cần có

- `get_employee_profile(employee_id)`
- `get_onboarding_checklist(employee_id)`
- `get_onboarding_schedule(employee_id)`
- `search_policy_docs(query, employee_context)`
- `get_mandatory_trainings(role_id)`
- `get_asset_provision_status(employee_id)`
- `create_hr_support_ticket(employee_id, issue)` - optional cho phase 2

##### FE cần làm

- màn chat onboarding
- suggested prompts
- thẻ "Checklist của tôi"
- thẻ "Việc cần làm hôm nay"
- thẻ "Nguồn tham chiếu"

##### Backend cần làm

- service lấy checklist
- service policy/knowledge search
- API schedule onboarding
- API asset/account status
- audit log cho mọi câu trả lời của agent

##### Yêu cầu chất lượng

- câu trả lời phải có nguồn
- nếu không chắc, phải nói không chắc
- nếu thiếu dữ liệu, đề nghị action tiếp theo
- không được bịa policy

##### Acceptance criteria

- trả lời đúng ít nhất 90% câu FAQ onboarding đã định nghĩa
- mọi câu trả lời đều log trace tool
- câu hỏi ngoài phạm vi phải fallback lịch sự

#### 7) Training Recommendation Agent

##### Mục tiêu

Đề xuất khóa học phù hợp theo:

- role
- skill gap
- onboarding stage
- mandatory training
- lịch sử học tập
- level hiện tại

##### Use cases

- "Tôi nên học gì tuần này?"
- "Tôi là backend intern thì nên bắt đầu từ đâu?"
- "Khóa nào giúp tôi cải thiện kỹ năng giao tiếp/presentation?"
- "Gợi ý 5 khóa phù hợp nhất cho nhân sự mới team Sales"

##### Luồng xử lý

1. Lấy hồ sơ người dùng
2. Lấy competency profile
3. Lấy course catalog
4. Lấy training history
5. Recommendation Service backend tính score
6. Agent diễn giải thành gợi ý tự nhiên

##### Điểm cực kỳ quan trọng

**Không nên để LLM tự chấm điểm recommendation từ đầu.** Nên có **Recommendation Engine ở backend**.

##### Cách chia trách nhiệm hợp lý

###### Backend

Tính ranking theo công thức:

- mandatory weight
- skill gap weight
- role relevance
- prerequisite satisfied
- estimated duration fit
- completion history

###### Agent

- giải thích vì sao đề xuất khóa đó
- tóm tắt lợi ích
- cá nhân hóa ngôn ngữ theo người dùng

##### Tools/API cần có

- `get_employee_profile(employee_id)`
- `get_competency_profile(employee_id)`
- `get_training_history(employee_id)`
- `search_course_catalog(filters)`
- `recommend_courses(employee_id, context)`
- `get_course_details(course_id)`

##### FE cần làm

- màn hình recommendations
- filter theo:
  - mandatory
  - skill
  - duration
  - level
- nút "Tại sao được gợi ý?"
- nút "Thêm vào learning path"

##### Acceptance criteria

- recommendation phải explainable
- không đề xuất khóa đã hoàn thành trừ khi là refresher
- không đề xuất khóa chưa đủ prerequisite
- có thể trả top 5/top 10 ổn định

#### 8) Learning Path Agent

##### Mục tiêu

Tạo lộ trình học cá nhân hóa theo mốc 7 ngày / 30 ngày / 60 ngày / 90 ngày hoặc theo mục tiêu cụ thể.

##### Use cases

- "Hãy tạo lộ trình 30 ngày cho nhân viên mới vị trí CS"
- "Tạo roadmap học cho tôi để lên Senior BE"
- "Từ các khóa đã gợi ý, sắp thành lộ trình theo tuần"

##### Luồng xử lý

1. Người dùng nhập mục tiêu hoặc chọn template
2. OpenClaw route sang Learning Path Agent
3. Agent lấy:
   - role
   - current skills
   - mandatory training
   - recommended courses
   - prerequisites
   - thời lượng học khả dụng
4. Backend Path Service sinh draft path hợp lệ
5. Agent diễn giải và tối ưu ngôn ngữ
6. FE cho phép edit/approve/save

##### Cần lưu ý

Learning Path phải là **đối tượng có trạng thái**, không chỉ là đoạn text chat.

##### Path object nên có

- `path_id`
- `owner`
- `title`
- `goal`
- `duration`
- `milestones`
- `items` theo tuần
- `estimated_hours`
- `status`: `draft` / `approved` / `active` / `completed`
- `version`

##### Tools/API cần có

- `get_employee_profile(employee_id)`
- `get_competency_profile(employee_id)`
- `recommend_courses(employee_id, goal)`
- `validate_course_prerequisites(course_ids)`
- `generate_learning_path(employee_id, goal, constraints)`
- `save_learning_path(path_payload)`
- `update_learning_path(path_id, changes)`

##### FE cần làm

- builder UI dạng timeline
- kéo thả course vào tuần
- edit mục tiêu
- save version
- approve/publish path

##### Acceptance criteria

- path không vi phạm prerequisite
- path có milestone rõ
- path có tổng thời lượng hợp lý
- path có thể chỉnh tay sau khi AI sinh

#### 9) Quiz Generator Agent

##### Mục tiêu

Sinh bài kiểm tra đào tạo từ:

- khóa học
- module
- tài liệu
- mục tiêu học tập
- mức độ khó
- loại câu hỏi

##### Use cases

- "Tạo quiz 10 câu cho khóa Security Basics"
- "Sinh 5 câu trắc nghiệm + 2 câu tình huống"
- "Tạo pre-test và post-test cho module onboarding"

##### Kiến trúc hợp lý

Quiz generation nên là pipeline 2 bước:

###### Bước 1: Generate

Agent sinh câu hỏi từ tài liệu đã grounding.

###### Bước 2: Validate

Backend validator kiểm tra:

- đúng nguồn
- đúng đáp án
- không trùng
- không mơ hồ
- difficulty hợp lý

##### Tuyệt đối không nên

- cho agent sinh xong là publish luôn ở phase đầu

##### Dữ liệu đầu vào

- learning objective
- tài liệu khóa học
- chapter/module
- taxonomy level
- số câu
- ngôn ngữ
- format

##### Tools/API cần có

- `get_course_details(course_id)`
- `retrieve_course_content_chunks(course_id, module_id)`
- `generate_quiz_draft(config, content_chunks)`
- `validate_quiz_draft(quiz_draft_id)`
- `save_quiz(quiz_payload)`
- `publish_quiz(quiz_id)` - nên có approval trước
- `get_question_bank(filters)` - phase 2 nếu cần tái sử dụng

##### FE cần làm

- form tạo quiz
- preview câu hỏi
- highlight nguồn tham chiếu
- nút regenerate 1 câu / regenerate cả quiz
- review & approve

##### Acceptance criteria

- mỗi câu có trace về nguồn
- mỗi câu có đúng 1 đáp án đúng nếu là single-choice
- validator chặn câu mơ hồ
- quiz draft phải qua review trước publish

#### 10) Feedback Analysis Agent

##### Mục tiêu

Phân tích phản hồi đào tạo từ text và rating để rút ra:

- sentiment
- topic/theme
- pain point
- đề xuất cải tiến

##### Use cases

- "Tổng hợp feedback của khóa Onboarding tháng này"
- "Top 5 vấn đề bị phàn nàn nhiều nhất"
- "Feedback của nhân viên mới team Tech có gì nổi bật?"
- "So sánh phản hồi trước và sau khi đổi nội dung khóa học"

##### Đây không nên chỉ là sentiment analysis đơn giản

Nên phân tích theo 4 lớp:

1. sentiment tổng thể
2. theme/topic
3. aspect-based sentiment
4. recommendation for improvement

Ví dụ aspect:

- nội dung
- giảng viên
- tốc độ
- tính thực tế
- tài liệu
- nền tảng học

##### Luồng xử lý

1. FE chọn phạm vi phân tích
2. OpenClaw route sang Feedback Analysis Agent
3. Agent lấy feedback corpus từ backend
4. Agent hoặc analytics service phân loại/chấm nhóm
5. Trả dashboard tóm tắt + insight + cảnh báo

##### Tools/API cần có

- `get_feedback_corpus(filters)`
- `get_feedback_summary(filters)`
- `analyze_feedback_topics(filters)`
- `analyze_feedback_sentiment(filters)`
- `compare_feedback_periods(filter_a, filter_b)`
- `generate_improvement_suggestions(analysis_result)`

##### FE cần làm

- dashboard feedback
- filter theo:
  - khóa học
  - thời gian
  - phòng ban
  - nhóm nhân viên
- view themes
- drill-down từng comment
- export report

##### Ràng buộc quan trọng

- ẩn danh dữ liệu
- chỉ hiển thị aggregate nếu đủ số lượng mẫu
- không gán nhãn tiêu cực cho cá nhân cụ thể
- không dùng agent để "đánh giá con người"

##### Acceptance criteria

- phân loại đúng theme ở mức usable
- có insight hành động được
- không lộ dữ liệu cá nhân
- có so sánh theo kỳ

### 3.5. Thiết kế API mức nghiệp vụ

Tôi khuyên bạn chia API thành 2 lớp:

#### A. UI APIs cho FE

Ví dụ:

- `GET /me/onboarding/checklist`
- `GET /me/training/recommendations`
- `GET /me/learning-paths`
- `POST /quizzes/draft`
- `GET /feedback/summary`

#### B. Agent Tools cho OpenClaw

Ví dụ:

- `tool.get_onboarding_checklist`
- `tool.search_policy_docs`
- `tool.recommend_courses`
- `tool.generate_learning_path`
- `tool.generate_quiz_draft`
- `tool.analyze_feedback_topics`

Lý do phải tách:

- UI API và Agent API có mục đích khác nhau
- Agent API cần schema chặt hơn, whitelist rõ hơn, log mạnh hơn

### 3.6. Prompt/Agent contract

Mỗi subagent cần có contract rõ:

#### Input chuẩn

- user identity
- role
- department
- current task
- allowed tools
- response format
- safety rules

#### Output chuẩn

- `answer`
- `actions`
- `sources`
- `confidence`
- `needs_human_review`
- `tool_trace_id`

Điều này giúp FE render thống nhất.

### 3.7. Bảo mật và governance

Đây là phần nên đưa vào từ đầu, không để cuối.

#### Bắt buộc có

- RBAC theo user role
- tool-level permission
- audit log mọi tool call
- PII masking cho feedback
- rate limit
- timeout + retry
- prompt injection guard cho RAG
- output moderation cơ bản

#### Đặc biệt với agent

- không được gửi raw secret/token cho model
- không được cho model tự compose API tùy ý
- chỉ gọi tool có schema định trước

### 3.8. Logging và observability

Bạn sẽ rất khó debug nếu bỏ phần này.

#### Nên log

- session id
- user id
- intent
- selected agent
- tools called
- latency
- response status
- fallback reason
- hallucination flags
- human override

#### Dashboard vận hành nên có

- top intents
- top failed tool calls
- unanswered questions
- feedback negative spike
- quiz validation failure rate

### 3.9. Roadmap triển khai

#### Phase 1 - MVP

Ưu tiên:

1. Employee Guide Agent
2. Training Recommendation Agent
3. Learning Path Agent bản draft

Lý do:

- giá trị sớm
- ít rủi ro hơn quiz/feedback
- validate được kiến trúc OpenClaw + Tool Gateway

#### Phase 2

4. Quiz Generator Agent có human review
5. Feedback Analysis Agent dashboard cơ bản

#### Phase 3

- cross-agent workflow
- proactive recommendation
- auto-update learning path
- feedback trend prediction

### 3.10. Thứ tự build kỹ thuật tôi đề xuất

1. Xây **Backend domain services**
2. Xây **Tool Gateway + schema**
3. Xây **OpenClaw Orchestrator**
4. Làm **Employee Guide Agent**
5. Làm **Training Recommendation Agent**
6. Làm **Learning Path Agent**
7. Thêm **Quiz draft + validator**
8. Thêm **Feedback analysis**
9. Cuối cùng mới tối ưu FE/dashboard

---

## 4) Kết luận ngắn gọn: chỗ nào hợp lý, chỗ nào cần sửa

### Hợp lý

- Tách FE / BE / OpenClaw
- Dùng orchestrator + subagents
- Chỉ cho subagent gọi API
- Giới hạn nguồn dữ liệu được phép

### Cần sửa

- Không cho subagent gọi "mọi API", phải qua **Tool Gateway**
- Không chỉ dựa vào API dữ liệu cấu trúc; cần **Knowledge/RAG API** cho docs/policy/materials
- Orchestrator không nên chỉ "nghe và gọi", mà phải có context + policy + fallback
- Recommendation / Learning Path không để LLM quyết định toàn bộ
- Quiz phải có validator
- Feedback phải có ẩn danh và aggregate rule

Nếu bạn muốn, bước tiếp theo tôi có thể viết luôn cho bạn bản **Solution Design Document hoàn chỉnh** cho phạm vi 6-10, gồm:

- kiến trúc hệ thống
- API list
- schema dữ liệu
- luồng sequence
- backlog task cho BE / FE / OpenClaw theo sprint
