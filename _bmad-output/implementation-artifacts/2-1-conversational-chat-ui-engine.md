# Story 2.1: Conversational Chat UI Engine

Status: review

## Story

As an Employee,
I want to interact with a chat interface that streams responses in real-time,
So that I feel immediate, natural feedback typical of modern AI assistants without waiting for the whole response to load.

## Acceptance Criteria

1. **Given** the employee is on the chat dashboard
2. **When** they type a message and press send
3. **Then** their message should appear on the right side of the chat log
4. **And** the UI must connect to the Backend via Server-Sent Events (`EventSource` API)
5. **And** the UI must incrementally append (render) the AI's response chunks as they arrive, simulating human typing.

## Technical Requirements & Developer Context

### Architecture Compliance
- **Backend (NestJS):**
  - Use `@Sse()` decorator in `ChatController`.
  - Endpoint: `POST /chat/message` (có thể cần dùng `/api/chat/message` để thống nhất).
  - Sử dụng `Observable` từ `rxjs` để stream dữ liệu.
- **Frontend (Vite+React):**
  - Sử dụng `fetch` hoặc thư viện chuyên dụng để đọc stream từ SSE (vì `EventSource` chuẩn không hỗ trợ POST method dễ dàng với headers).
  - Lưu trạng thái tin nhắn trong Zustand store hoặc local state.

### File Structure Requirements
- `be/src/modules/chat/chat.controller.ts`
- `be/src/modules/chat/chat.service.ts`
- `be/src/modules/chat/conversation.service.ts`
- `fe/src/pages/ChatDashboardPage.jsx` (Cập nhật logic chat)
- `fe/src/services/chatService.js`

## Tasks / Subtasks

- [x] Task 1: Backend Chat Infrastructure
  - [x] Implement `ConversationService` (Prisma)
  - [x] Implement `ChatService` orchestration (Skeleton)
  - [x] Implement `ChatController` with SSE endpoint
- [x] Task 2: Frontend Chat UI & Streaming
  - [x] Create `chatService.js` for SSE communication
  - [x] Update `ChatDashboardPage.jsx` to handle real-time streaming
  - [x] Implement auto-scroll to bottom of chat
- [x] Task 3: Integration & Testing
  - [x] Test end-to-end flow with a mock streaming response from backend

## Dev Agent Record

### Debug Log

- Reworked the frontend chat dashboard so user messages render immediately and the assistant response is incrementally appended from SSE chunks.
- Hardened the SSE client parser in `chatService.js` to handle buffered chunks and flush the final partial event safely.
- Verified the updated React chat flow still builds and lints cleanly after the streaming changes.

### Completion Notes

- `ChatDashboardPage.jsx` now creates a stable assistant placeholder message and appends incoming chunks into that message as the backend streams data.
- The chat view continues auto-scrolling as new chunks arrive, preserving the real-time conversational feel expected by the story.
- FE validation completed successfully with `npm run lint` and `npm run build`.

## File List

- `fe/src/pages/ChatDashboardPage.jsx`
- `fe/src/services/chatService.js`

## Change Log

- `2026-03-22`: Completed the remaining frontend streaming work for the chat UI, including stable SSE chunk handling and incremental assistant rendering.
