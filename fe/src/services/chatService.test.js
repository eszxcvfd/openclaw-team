import { describe, expect, it } from 'vitest'

import { normalizeChatMessage, normalizeUiPayload } from './chatService'

describe('chatService quiz normalization', () => {
  it('normalizes explicit quiz payload metadata into compact quiz card data', () => {
    const payload = normalizeUiPayload({
      type: 'quiz',
      version: '1',
      quizId: 'quiz-101',
      title: 'Node.js basics',
      description: 'Quick skill check',
      skillName: 'Node.js',
      difficulty: 'Beginner',
      questions: [
        {
          questionId: 'q-1',
          questionText: 'What does Node.js run on?',
          questionType: 'single_choice',
          options: ['V8', 'JVM'],
          orderNo: 2,
        },
        {
          questionId: 'q-2',
          questionText: 'Node.js is used on the server.',
          questionType: 'boolean',
          orderNo: 1,
        },
      ],
      result: {
        attemptId: 'attempt-1',
        score: 2,
        maxScore: 2,
      },
    })

    expect(payload).toEqual({
      type: 'quiz',
      version: '1',
      quizId: 'quiz-101',
      title: 'Node.js basics',
      description: 'Quick skill check',
      contextLabel: 'Node.js',
      difficulty: 'Beginner',
      questionCount: 2,
      submitLabel: 'Nop bai',
      items: [
        {
          questionId: 'q-2',
          prompt: 'Node.js is used on the server.',
          description: '',
          type: 'boolean',
          options: [
            { id: 'true', value: true, label: 'Dung' },
            { id: 'false', value: false, label: 'Sai' },
          ],
          required: true,
          orderNo: 1,
        },
        {
          questionId: 'q-1',
          prompt: 'What does Node.js run on?',
          description: '',
          type: 'single_choice',
          options: [
            { id: 'option-1', value: 'V8', label: 'V8' },
            { id: 'option-2', value: 'JVM', label: 'JVM' },
          ],
          required: true,
          orderNo: 2,
        },
      ],
      result: {
        attemptId: 'attempt-1',
        quizId: '',
        score: 2,
        maxScore: 2,
        durationSeconds: null,
        submittedAt: '',
        summary: '',
      },
    })
  })

  it('rehydrates a persisted message from metadata.uiPayload', () => {
    const message = normalizeChatMessage({
      id: 'assistant-1',
      sender_type: 'assistant',
      content: 'Here is your quiz',
      metadata: {
        uiPayload: {
          type: 'quiz',
          quizId: 'quiz-history',
          title: 'History quiz',
          questions: [
            {
              questionId: 'q-h-1',
              prompt: 'Which runtime powers Node.js?',
              type: 'single_choice',
              options: ['V8', 'SpiderMonkey'],
            },
          ],
          result: {
            attemptId: 'attempt-history',
            quizId: 'quiz-history',
            score: 1,
            durationSeconds: 45,
            submittedAt: '2026-03-23T10:00:00.000Z',
          },
        },
      },
    })

    expect(message.uiPayload).toMatchObject({
      type: 'quiz',
      quizId: 'quiz-history',
      items: [
        {
          questionId: 'q-h-1',
          prompt: 'Which runtime powers Node.js?',
        },
      ],
      result: {
        attemptId: 'attempt-history',
        score: 1,
        durationSeconds: 45,
      },
    })
  })

  it('keeps malformed quiz payloads on plain text fallback', () => {
    const message = normalizeChatMessage({
      id: 'assistant-2',
      sender_type: 'assistant',
      content: 'Quiz fallback text',
      metadata: {
        uiPayload: {
          type: 'quiz',
          title: 'Broken quiz',
          questions: [],
        },
      },
    })

    expect(message.uiPayload).toBeNull()
    expect(message.content).toBe('Quiz fallback text')
  })

  it('normalizes learning-path payload metadata into roadmap card data', () => {
    const payload = normalizeUiPayload({
      type: 'learning-path',
      version: 1,
      pathId: 'path-101',
      title: 'Backend Intern Path',
      description: 'Lo trinh hoc ca nhan hoa',
      contextLabel: 'Gap: Node.js',
      generated: true,
      items: [
        {
          orderNo: 2,
          courseId: 'course-2',
          courseCode: 'node-101',
          courseTitle: 'Node.js Basics',
          required: true,
          reason: 'Gap hien tai la Node.js',
          estimatedHours: 6,
          status: 'not_started',
        },
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
      summary: 'Bat dau voi Product Overview.',
    })

    expect(payload).toEqual({
      type: 'learning-path',
      version: '1',
      pathId: 'path-101',
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
        {
          orderNo: 2,
          courseId: 'course-2',
          courseCode: 'node-101',
          courseTitle: 'Node.js Basics',
          required: true,
          reason: 'Gap hien tai la Node.js',
          estimatedHours: 6,
          status: 'not_started',
        },
      ],
    })
  })

  it('normalizes analytics summary payloads into compact card data', () => {
    const payload = normalizeUiPayload({
      type: 'analytics-summary',
      title: 'Q1 Training Summary',
      departmentName: 'Customer Success',
      periodLabel: 'Q1 2026',
      completionRate: 84.4,
      sentimentBreakdown: {
        positive: 18,
        neutral: 6,
        negative: 2,
      },
      sentimentLabel: 'Mostly positive',
      generatedAt: '2026-03-23T10:15:00.000Z',
    })

    expect(payload).toEqual({
      type: 'analytics-summary',
      title: 'Q1 Training Summary',
      departmentName: 'Customer Success',
      periodLabel: 'Q1 2026',
      completionRate: 84.4,
      sentimentBreakdown: {
        positive: 18,
        neutral: 6,
        negative: 2,
      },
      sentimentLabel: 'Mostly positive',
      generatedAt: '2026-03-23T10:15:00.000Z',
    })
  })

  it('keeps malformed analytics summary payloads on plain text fallback', () => {
    const message = normalizeChatMessage({
      id: 'assistant-analytics-bad',
      sender_type: 'assistant',
      content: 'Analytics fallback text',
      metadata: {
        uiPayload: {
          type: 'analytics-summary',
          title: 'Broken summary',
          departmentName: 'Customer Success',
          periodLabel: 'Q1 2026',
        },
      },
    })

    expect(message.uiPayload).toBeNull()
    expect(message.content).toBe('Analytics fallback text')
  })

  it('returns null for empty analytics summary payloads', () => {
    expect(
      normalizeUiPayload({
        type: 'analytics-summary',
        title: 'Empty summary',
        departmentName: 'People Ops',
        periodLabel: 'March 2026',
        completionRate: 70,
        sentimentBreakdown: {},
      }),
    ).toBeNull()
  })

  it('rehydrates analytics summary payloads from persisted metadata', () => {
    const message = normalizeChatMessage({
      id: 'assistant-analytics-1',
      sender_type: 'assistant',
      content: 'Analytics summary loaded from history.',
      metadata: {
        uiPayload: {
          type: 'analytics-summary',
          title: 'Department Summary',
          departmentName: 'People Ops',
          periodLabel: 'March 2026',
          completionRate: 72.5,
          sentimentBreakdown: {
            positive: 10,
            neutral: 5,
            negative: 1,
          },
          sentimentLabel: 'Stable',
        },
      },
    })

    expect(message.uiPayload).toEqual({
      type: 'analytics-summary',
      title: 'Department Summary',
      departmentName: 'People Ops',
      periodLabel: 'March 2026',
      completionRate: 72.5,
      sentimentBreakdown: {
        positive: 10,
        neutral: 5,
        negative: 1,
      },
      sentimentLabel: 'Stable',
      generatedAt: '',
    })
  })
})
