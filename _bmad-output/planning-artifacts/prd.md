---
stepsCompleted:
  - step-01-init
  - step-02-discovery
  - step-02b-vision
  - step-02c-executive-summary
  - step-03-success
  - step-04-journeys
  - step-05-domain
  - step-06-innovation
  - step-07-project-type
  - step-08-scoping
  - step-09-functional
  - step-10-nonfunctional
  - step-11-polish
inputDocuments:
  - d:\openclaw-team\PLAN.md
workflowType: 'prd'
classification:
  projectType: 'Enterprise Platform / B2B SaaS'
  domain: 'Enterprise HR Tech & EdTech'
  complexity: 'High'
  projectContext: 'brownfield'
---

# Product Requirements Document - OpenClaw

**Author:** Giang
**Date:** 2026-03-22

## Executive Summary

Dự án OpenClaw là nền tảng AI nội bộ doanh nghiệp được thiết kế để tự động hóa vòng đời nhân viên. Hệ thống cung cấp ba module nghiệp vụ: Onboarding (Hội nhập), Learning & Training (Đào tạo), và Training Analytics (Phân tích chỉ số). Mục tiêu của dự án là triển khai các trợ lý AI nhận thức ngữ cảnh (context-aware AI assistants) giúp tăng năng suất làm việc, tuân thủ tuyệt đối các tiêu chuẩn bảo mật và hệ thống phân quyền nhân sự (RBAC).

**Project Classification:**
- Loại dự án: Enterprise Platform / B2B SaaS
- Lĩnh vực (Domain): Enterprise HR Tech & EdTech
- Độ phức tạp: Cao (High) - Đòi hỏi điều phối luồng thực thi AI cực kỳ khắt khe về bảo mật.

## Innovation & Competitive Differentiator

Yếu tố cốt lõi làm nên sự khác biệt của OpenClaw là kiến trúc **"Backend-Controlled AI Orchestration"**. 
Thay vì áp dụng mô hình RAG thuần túy để cho AI quyền đọc Database trực tiếp (chứa nhiều rủi ro về Cross-tenant Data Leakage hoặc RBAC bypass), OpenClaw thiết lập Backend làm ranh giới bảo mật độc quyền (Security Boundary). AI Engine hoạt động như một "Worker" bị cô lập, chỉ được phép gọi các API nội bộ thông qua token ngắn hạn (`internal_scoped_token`). 

*Phương pháp kiểm chứng (Validation):* Sử dụng Red Teaming & Pentest bằng kịch bản Prompt Injection cố ý lừa AI gọi API sai quyền để chứng minh Backend luôn chặn đứng các request truy cập trái phép.

## Success Criteria

### User & Business Success
- **Employee:** Tra cứu thông tin onboarding, hoàn thành checklist và nhận lộ trình học tập cá nhân hóa nhanh chóng qua giao diện chat tự nhiên.
- **HR / Manager:** Tự động tổng hợp báo cáo tiến độ và phân tích cảm xúc (sentiment) học viên, giảm thiểu thời gian xử lý các FAQ thủ công.
- **Business:** Rút ngắn thời gian hội nhập (Time-to-Productivity) của nhân viên mới, không có rủi ro rò rỉ dữ liệu hay vi phạm phân quyền doanh nghiệp.

### Technical & Measurable Success
- **Technical:** Kiến trúc AI vận hành trơn tru bằng `internal_scoped_token`. Tất cả hành động của AI được phân quyền chính xác, lưu vết Audit đầy đủ và đảm bảo độ trễ (latency) ở mức chấp nhận được.
- **Measurable:** Tỷ lệ hoàn thành Onboarding checklist đúng hạn đạt 100% mục tiêu. Giảm lượng ticket HR hỗ trợ thủ công hàng tuần.

## User Journeys

### 1. Tân binh hội nhập (New Hire) - Minh
Tránh việc bị choáng ngợp bởi hàng tá tài liệu trong ngày đầu làm việc, Minh mở giao diện chat của OpenClaw. Cậu hỏi: "Hôm nay mình phải làm những gì?". `onboarding_assistant` lập tức chào tên cậu, hiển thị 3 task ưu tiên và giải đáp nhanh các quy định đỗ xe/cài máy in. Minh có thể trực tiếp bấm hoàn thành task trên khung chat.

### 2. Nhân viên phát triển kỹ năng (General Employee) - Lan
Lan chuẩn bị kỳ đánh giá cuối năm và nhận ra mình hụt kỹ năng "Advanced Data Analysis". Cô chat với `learning_training_agent`. AI sẽ đọc context hiện tại của cô kết hợp với cấu trúc Role để tự động đề xuất 2 khóa học tối ưu nhất, đồng thời sinh Quiz để test trình độ.

### 3. HR / L&D Manager - Chị Mai
Cuối quý, Mai cần báo cáo tiến độ đào tạo của khối kỹ thuật. Cô đăng nhập với Role Manager, lệnh cho `training_analytics_agent` phân tích và tóm tắt feedback. Agent lấy dữ liệu an toàn từ Backend Internal API, tổng hợp và xuất ra báo cáo Markdown/PDF trực quan trong chưa tới 10 giây.

### 4. Admin / Ban Bảo Mật - Nam
Nam kiểm tra bảng theo dõi lưu vết (Audit module). Anh đối chiếu `traceId` và thấy hệ thống ghi nhận một đoạn log mà AI cố gọi dữ liệu lương, nhưng Backend đã từ chối lập tức vì `internal_scoped_token` không có quyền. Kiến trúc "Backend-Controlled" đã chặn đứng lổ hổng ảo giác của AI.

## Project Scoping & Phased Development

Dự án triển khai theo triết lý "Vertical Slice & Security Proof-of-Concept". Trọng tâm MVP là hoàn thiện 100% module **Onboarding** để chứng minh độ an toàn của kiến trúc lõi trước khi scale sang tính năng khác.

### Phase 1: MVP Feature Set
- **Must-Have Capabilities:**
  - Auth & Core: Đăng nhập cơ bản, RBAC phân biệt nhân viên vs Quản trị.
  - Chat UI: Giao diện web hỗ trợ phản hồi văn bản (text response) và Suggestive Prompts (nút gợi ý).
  - Agent `onboarding_assistant`: Hội thoại hỏi đáp FAQ/Policy, hiển thị và check-off các Onboarding Tasks.
  - Security Audit: Backend sinh và truy vết `internal_scoped_token` cho mọi tác vụ gọi API của AI.

### Phase 2: Growth (Tăng trưởng)
- Đưa Agent `learning_training_agent` vào hỗ trợ gợi ý học tập, sinh Quiz.
- Đưa Agent `training_analytics_agent` vào tổng hợp báo cáo và phân tích Sentiment cho Manager.
- Interactive Components trong Chat UI giúp user dùng như một Mini App.

### Phase 3: Expansion (Mở rộng & Hoàn thiện)
- Gia cố hệ thống (Hardening): Kích hoạt cường độ cao Rate Limiting, Audit Security Logging, Observability chuẩn bị cho Production.
- Áp dụng Message Queue (BullMQ) xử lý Background Jobs cho các report tải nặng.

### Risk Mitigation Strategy
- **Technical (Latency do nhiều tầng API):** Thiết lập Timeout nghiêm ngặt (30s). Bắt buộc đưa giao thức Streaming (SSE) vào MVP để tạo hiệu ứng "bắt đầu trích xuất chữ lập tức", giảm cảm giác chờ đợi.
- **Adoption (Nhân viên mới ngại gõ prompt):** Bổ sung các "Suggestive Prompts" mặc định.
- **Scope Creep:** Giới hạn tuyệt đối MVP ở Onboarding. Tạm ngưng các chức năng Learning & Analytics cho tới khi mô hình Sandbox AI chạy tốt ở môi trường live.

## Technical Architecture & Domain Setup

Hệ thống được thiết kế theo mô hình Tenant nội bộ nhiều phòng ban (Multi-Department).

### System Layers
1. **Frontend Layer (`fe/`):** React + Vite. Chỉ gọi API Frontend-facing bằng `user_access_token`. Tuyệt đối không giao tiếp trực tiếp qua HTTP sang hệ thống OpenClaw.
2. **Backend Layer (`be/`):** NestJS, PostgreSQL 16, Prisma, Redis. Đóng vai trò là "Control Plane", trực tiếp sinh `internal_scoped_token` và cấu trúc bối cảnh (Context Injection) trước khi gởi lệnh về OpenClaw.
3. **AI Engine Layer (`openclaw/`):** Vận hành logic suy nghĩ. Đọc tham chiếu tệp tĩnh `.md` trong thư mục `data/` như một Knowledge Base căn bản. Hệ thống này bị cách ly hoàn toàn với DB.

### Compliance & Security Boundaries
- **Zero-Trust Sandbox & Strict RBAC:** Backend từ chối trả kết quả HTTP 403 nếu quyền không đủ.
- **Data Privacy & Auditability:** Tuyệt đối không ghi đè dữ liệu mật khẩu, số chứng minh, v.v., vào dạng raw log. Audit Trail kết nối lưu vết toàn bộ bằng logic `traceId` và `conversationId`.

## Functional Requirements (Capability Contract)

### 1. Identity & Access Management
- **FR1:** Employee có thể đăng nhập vào hệ thống bằng thông tin tài khoản nội bộ.
- **FR2:** Hệ thống tự động nhận diện Role và Department của người dùng ngay sau khi đăng nhập thành công.
- **FR3:** Ban Bảo mật / Admin có thể đặc tả và phân quyền sử dụng hệ thống từ giao diện quản trị.

### 2. AI Chat Interaction (MVP)
- **FR4:** Employee có thể gửi câu hỏi dạng văn bản tới AI Chatbot và nhận phản hồi được cá nhân hóa chặt chẽ theo Context của chính User đó.
- **FR5:** Employee có thể tương tác chọn các "Lệnh gợi ý" (Suggestive Prompts) do giao diện Chatbot cung cấp sẵn.
- **FR6:** Employee có thể tạo đoạn hội thoại mới hoặc xem lại toàn bộ lịch sử trò chuyện cũ.

### 3. Onboarding Capabilities (MVP)
- **FR7:** Backend tự động thu thập Profile của người dùng để tiêm chung vào prompt trước khi đẩy sang `onboarding_assistant`.
- **FR8:** Tân binh (New Hire) có thể theo dõi và đánh dấu hoàn thành (Check-off) các Onboarding Tasks của mình bằng chat hoặc nút bấm trên UI chatbot.
- **FR9:** Tân binh có thể thông qua AI để tra cứu nhanh các câu hỏi FAQ, Nội quy, và Danh bạ hỗ trợ IT/HR (Support Contacts).

### 4. Security & Audit Operations (Core MVP)
- **FR10:** Backend tiến hành sinh và đính kèm `internal_scoped_token` giới hạn thời gian tự động mỗi lần AI muốn lấy dữ liệu.
- **FR11:** System tự động chặn và trả lỗi mọi lệnh từ AI nếu Agent yêu cầu truy xuất vượt quyền hoặc lấy chéo dữ liệu của nhân sự khác.
- **FR12:** Ban Bảo mật có quyền tra soát trực tiếp nhật ký lưu vết chi tiết (kèm `traceId`, nội dung, kết quả thực thi lỗi) của tất cả Tool Calls do Agent tạo ra.

### 5. Future Capabilities (Phase 2 & 3)
- **FR13:** Employee có thể nộp kết quả chấm điểm (submit) các bài thi Mini-Quiz do AI gen ra. *(Growth)*
- **FR14:** Employee có thể yêu cầu gợi ý xây dựng Lộ trình Đào tạo (Learning Path) qua tính cá nhân hóa. *(Growth)*
- **FR15:** Manager có thể lấy báo cáo tổng tiến độ đào tạo của chi nhánh cùng kết quả đánh giá phân tích Sentiment sơ bộ. *(Growth)*

## Non-Functional Requirements

### Performance & Reliability
- **NFR1 (Time to First Token - TTFT):** Hệ thống phải bắt đầu trả token text đầu tiên cho Chat UI trong vòng **tối đa 3 giây** tính từ lúc người dùng gửi prompt.
- **NFR2 (Tool Execution Time):** Thời gian chọc Data qua Internal API cho AI không được vượt quá **2 giây/lần gọi**.
- **NFR3 (Graceful Degradation):** Nếu Backend hoặc LLM Service của OpenAI gặp sự cố mạng, thay vì đứng khung màn hình, Chatbot phải ngắt luồng và hiển thị thông báo lỗi thân thiện sau **tối đa 5 giây**.
- **NFR4 (Retry Mechanism):** Các HTTP request backend-to-backend phải hỗ trợ Auto-Retry mạng **tối đa 2 lần** với lỗi timeout hoặc 503.

### Security & Maintainability
- **NFR5 (Short-lived Tokens):** Toàn bộ token cấp tạm cho AI làm công cụ truy cập DB chỉ có tuổi thọ Time-to-Live **tối đa 5 phút**.
- **NFR6 (End-to-end Traceability):** Từng đoạn hội thoại sẽ được định danh theo UUID (`conversationId`). Bất kỳ lỗi sinh ra từ FE, BE hay OpenClaw Engine sẽ được đính mã ID này vào Audit Log.
- **NFR7 (Audit Integrity):** Lưu trữ Log cho Tool Calls theo cơ chế Append-only (không cho phép Developer xóa/sửa) để duy trì toàn vẹn dữ liệu điều tra bảo mật.
