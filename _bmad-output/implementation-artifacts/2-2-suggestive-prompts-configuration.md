# Story 2.2: Suggestive Prompts Configuration

Status: review

## Story

As an Employee,
I want to see actionable "Suggestive Prompts" before I start a conversation,
So that I don't have to manually type long, repetitive questions.

## Acceptance Criteria

1. **Given** a new or empty chat session
2. **When** the chat UI is rendered
3. **Then** the UI should display at least 3 clickable preset prompts (e.g., "Tôi phải làm gì vào ngày đầu?", "Xem quy định của công ty")
4. **And** clicking a prompt should inject the text into the input field and submit it immediately.

## Technical Requirements & Developer Context

### Architecture Compliance
- **Frontend (Vite+React):**
  - Hiển thị các "Suggestion Chips" ở giữa màn hình chat khi `messages.length === 0`.
  - Có thể cấu hình danh sách gợi ý trong một hằng số hoặc lấy từ Backend.
  - Sử dụng Tailwind CSS v4 để tạo style cho các chip này.

### File Structure Requirements
- `fe/src/pages/ChatDashboardPage.jsx` (Cập nhật UI gợi ý)

## Tasks / Subtasks

- [x] Task 1: Define Suggestion Prompts
  - [x] Create a list of 3-5 standard prompts (Onboarding, Policy, Support).
- [x] Task 2: Implement Suggestion UI
  - [x] Render suggestion chips only when no messages exist.
  - [x] Add click handler to auto-submit the prompt.
- [x] Task 3: UX & Styling
  - [x] Style chips for modern, interactive look using Tailwind v4.

## Dev Agent Record

### Debug Log

- Updated the empty-state chat experience to keep the suggestion chips visible only when the session has no messages.
- Changed prompt chip behavior so clicking a suggestion first injects the text into the input field, then immediately submits it through the normal send flow.
- Preserved the current visual language while using Tailwind utility classes on the chip buttons for the interactive states required by the story.

### Completion Notes

- Added a focused list of onboarding, policy, support, and training prompts in `ChatDashboardPage.jsx`.
- Implemented a queued prompt submission flow with `useEffectEvent` so the chip interaction matches the acceptance criteria without introducing hook warnings.
- Suggestion chips now disable correctly while a message is streaming or conversation history is loading.

## File List

- `fe/src/pages/ChatDashboardPage.jsx`

## Change Log

- `2026-03-22`: Finished the suggestive prompt flow so empty chat sessions show actionable chips that inject into the input and auto-submit immediately.
