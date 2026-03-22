# Story 2.3: Chat History Local & Remote Sync

Status: review

## Story

As an Employee,
I want to start new conversations or load previous ones from a sidebar,
So that I can resume past discussions without losing context.

## Acceptance Criteria

1. **Given** the user has previously interacted with the AI
2. **When** they view the conversation history sidebar
3. **Then** the Frontend should fetch a list of past `conversationId`s from the REST API
4. **And** clicking a past session MUST clear the current screen and fetch/load its historical messages into the state view.

## Technical Requirements & Developer Context

### Architecture Compliance
- **Frontend (Vite+React):**
  - Sử dụng `useQuery` từ TanStack Query để fetch danh sách hội thoại.
  - Sử dụng `useQuery` để fetch tin nhắn khi chọn một hội thoại.
  - Sidebar hiển thị tiêu đề hoặc đoạn ngắn của tin nhắn đầu tiên/cuối cùng (hoặc ID nếu chưa có tiêu đề).

### File Structure Requirements
- `fe/src/pages/ChatDashboardPage.jsx` (Cập nhật UI Sidebar)
- `fe/src/services/chatService.js` (Sử dụng các hàm có sẵn)

## Tasks / Subtasks

- [x] Task 1: Fetch and Display Conversations
  - [x] Use `useQuery` to fetch `GET /api/chat/conversations`.
  - [x] Render a list of past chats in the Sidebar.
- [x] Task 2: Load Selected Conversation History
  - [x] Add click handler to fetch `GET /api/chat/conversations/:id/messages`.
  - [x] Update `messages` state with historical data.
- [x] Task 3: New Chat Functionality
  - [x] Implement "New Chat" button to clear current session and start fresh.
- [x] Task 4: UX & Polish
  - [x] Active state styling for the selected conversation.
  - [x] Loading states while fetching history.

## Dev Agent Record

### Debug Log

- Replaced the manual history fetch flow with TanStack Query for both the conversation list and the selected conversation messages.
- Updated the sidebar cards to show a preview/fallback label instead of relying only on `session_key`, matching the story guidance more closely.
- Added the missing UX details for loading selected history, resetting the screen on new chat, and visually marking the active conversation.

### Completion Notes

- `ChatDashboardPage.jsx` now clears the visible message list before loading a selected conversation and then hydrates it from the `useQuery` result.
- Sidebar history uses cached message data when available to derive a more helpful preview, with a conversation ID fallback when no preview text exists.
- Added dedicated sidebar card styles in `App.css`, and confirmed the updated FE passes both lint and build validation.

## File List

- `fe/src/pages/ChatDashboardPage.jsx`
- `fe/src/services/chatService.js`
- `fe/src/App.css`

## Change Log

- `2026-03-22`: Completed the remaining chat history sync work by moving selected conversation loading to `useQuery`, improving sidebar previews, and polishing active/loading states.
