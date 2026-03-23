import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ChatDashboardPage } from './ChatDashboardPage'
import { chatService, normalizeChatMessage } from '../services/chatService'
import { onboardingService } from '../services/onboardingService'
import { trainingService } from '../services/trainingService'
import { useAuthStore } from '../store/authStore'

vi.mock('../services/onboardingService', () => ({
  onboardingService: {
    completeChecklistTask: vi.fn(),
  },
}))

vi.mock('../services/trainingService', () => ({
  trainingService: {
    submitQuiz: vi.fn(),
    getQuizResult: vi.fn(),
  },
}))

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })

  return function Wrapper({ children }) {
    return (
      <MemoryRouter>
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      </MemoryRouter>
    )
  }
}

function renderPage() {
  return render(<ChatDashboardPage />, { wrapper: createWrapper() })
}

describe('ChatDashboardPage quiz card', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    useAuthStore.setState({
      session: {
        user: {
          id: 'user-1',
          fullName: 'Learner One',
          email: 'learner@example.com',
          role: 'Employee',
          roleCode: 'employee',
          department: 'Training',
        },
        tokens: {
          userAccessToken: 'token-123',
        },
      },
    })

    chatService.getConversations = vi.fn().mockResolvedValue([
      {
        id: 'conv-1',
        session_key: 'session-1',
        started_at: '2026-03-23T10:00:00.000Z',
        title: 'Quiz conversation',
      },
    ])
    chatService.getMessages = vi.fn().mockResolvedValue([])
    chatService.sendMessageStream = vi.fn()
    onboardingService.completeChecklistTask.mockResolvedValue({ success: true })
    trainingService.submitQuiz.mockResolvedValue({
      attemptId: 'attempt-88',
      quizId: 'quiz-88',
      score: 1,
      submittedAt: '2026-03-23T10:02:00.000Z',
    })
    trainingService.getQuizResult.mockResolvedValue({
      attemptId: 'attempt-88',
      quizId: 'quiz-88',
      score: 1,
      maxScore: 1,
      durationSeconds: 32,
      submittedAt: '2026-03-23T10:02:00.000Z',
      summary: 'Ban da tra loi dung toan bo.',
    })
  })

  it('renders inline quiz card from persisted history and submits answers without breaking chat layout', async () => {
    chatService.getMessages.mockResolvedValue([
      normalizeChatMessage({
        id: 'assistant-quiz-1',
        sender_type: 'assistant',
        content: 'Lam mini quiz nay nhe.',
        metadata: {
          uiPayload: {
            type: 'quiz',
            version: '1',
            quizId: 'quiz-88',
            title: 'Node basics',
            description: 'Kiem tra nhanh ve runtime',
            skillName: 'Node.js',
            questions: [
              {
                questionId: 'q-1',
                questionText: 'Node.js uses which JavaScript engine?',
                questionType: 'single_choice',
                options: ['V8', 'JavaScriptCore'],
              },
            ],
          },
        },
      }),
    ])

    renderPage()

    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: /Quiz conversation/i }))

    expect(await screen.findByText('Node basics')).toBeInTheDocument()
    expect(screen.getByText('Lam mini quiz nay nhe.')).toBeInTheDocument()
    expect(screen.getByText('Node.js')).toBeInTheDocument()

    await user.click(screen.getByLabelText('V8'))
    await user.click(screen.getByRole('button', { name: 'Nop bai' }))

    await waitFor(() => {
      expect(trainingService.submitQuiz).toHaveBeenCalledWith({
        quizId: 'quiz-88',
        assistantMessageId: 'assistant-quiz-1',
        answers: [
          {
            questionId: 'q-1',
            answer: 'V8',
          },
        ],
        durationSeconds: null,
      })
    })

    await waitFor(() => {
      expect(trainingService.getQuizResult).toHaveBeenCalledWith('attempt-88')
    })

    expect(await screen.findByText('Da nop bai')).toBeInTheDocument()
    expect(screen.getByText('Diem 1/1')).toBeInTheDocument()
    expect(screen.getByText('Ban da tra loi dung toan bo.')).toBeInTheDocument()
  })

  it('shows quiz submission error state separately from checklist actions', async () => {
    trainingService.submitQuiz.mockRejectedValue(new Error('Submit failed'))
    chatService.getMessages.mockResolvedValue([
      normalizeChatMessage({
        id: 'assistant-quiz-2',
        sender_type: 'assistant',
        content: 'Thu quiz nay.',
        metadata: {
          uiPayload: {
            type: 'quiz',
            quizId: 'quiz-89',
            title: 'Boolean quiz',
            questions: [
              {
                questionId: 'q-bool',
                prompt: 'Node.js can run on the server.',
                type: 'boolean',
              },
            ],
          },
        },
      }),
    ])

    renderPage()

    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: /Quiz conversation/i }))
    await user.click(screen.getByLabelText('Dung'))
    await user.click(screen.getByRole('button', { name: 'Nop bai' }))

    expect(await screen.findByText('Submit failed')).toBeInTheDocument()
    expect(onboardingService.completeChecklistTask).not.toHaveBeenCalled()
  })

  it('rehydrates historical quiz result state from persisted metadata without new submission', async () => {
    chatService.getMessages.mockResolvedValue([
      normalizeChatMessage({
        id: 'assistant-quiz-3',
        sender_type: 'assistant',
        content: 'Ket qua lan truoc cua ban day.',
        metadata: {
          uiPayload: {
            type: 'quiz',
            quizId: 'quiz-history',
            title: 'History quiz',
            questions: [
              {
                questionId: 'q-history',
                prompt: 'Which runtime powers Node.js?',
                type: 'single_choice',
                options: ['V8', 'SpiderMonkey'],
              },
            ],
            result: {
              attemptId: 'attempt-history',
              quizId: 'quiz-history',
              score: 1,
              maxScore: 1,
              durationSeconds: 55,
              submittedAt: '2026-03-23T10:05:00.000Z',
              summary: 'Ket qua duoc tai lai tu lich su.',
            },
          },
        },
      }),
    ])

    renderPage()

    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: /Quiz conversation/i }))

    expect(await screen.findByText('History quiz')).toBeInTheDocument()
    expect(screen.getByText('Ket qua duoc tai lai tu lich su.')).toBeInTheDocument()
    expect(screen.getByText('Diem 1/1')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Nop bai' })).not.toBeInTheDocument()
    expect(trainingService.submitQuiz).not.toHaveBeenCalled()
  })

  it('renders inline learning-path roadmap cards from persisted history without breaking quiz flows', async () => {
    chatService.getMessages.mockResolvedValue([
      normalizeChatMessage({
        id: 'assistant-path-1',
        sender_type: 'assistant',
        content: 'Toi da goi y lo trinh hoc cho ban.',
        metadata: {
          uiPayload: {
            type: 'learning-path',
            version: 1,
            pathId: 'path-1',
            title: 'Backend Intern Path',
            description: 'Lo trinh hoc ca nhan hoa',
            contextLabel: 'Gap: Node.js',
            generated: true,
            summary: 'Bat dau voi Product Overview.',
            items: [
              {
                orderNo: 1,
                courseId: 'course-1',
                courseCode: 'prod-overview',
                courseTitle: 'Product Overview',
                required: true,
                reason: 'Mon nen tang',
                estimatedHours: 2,
                status: 'not_started',
              },
            ],
          },
        },
      }),
    ])

    renderPage()

    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: /Quiz conversation/i }))

    expect(await screen.findByText('Backend Intern Path')).toBeInTheDocument()
    expect(screen.getByText('Toi da goi y lo trinh hoc cho ban.')).toBeInTheDocument()
    expect(screen.getByText('Gap: Node.js')).toBeInTheDocument()
    expect(screen.getByText('Product Overview')).toBeInTheDocument()
    expect(screen.getByText('Mon nen tang')).toBeInTheDocument()
  })
})
