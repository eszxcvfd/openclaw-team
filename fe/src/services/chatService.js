import { useAuthStore } from '../store/authStore'
import { apiClient } from './apiClient'

const UI_PAYLOAD_PATTERNS = [
  /\[\[UI_PAYLOAD\]\]([\s\S]*?)\[\[\/UI_PAYLOAD\]\]/i,
  /\{\{UI_PAYLOAD\}\}([\s\S]*?)\{\{\/UI_PAYLOAD\}\}/i,
  /<ui-payload>([\s\S]*?)<\/ui-payload>/i,
  /```ui-payload\s*([\s\S]*?)```/i,
  /```tool-outcome\s*([\s\S]*?)```/i,
]

function getFirstString(...values) {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) {
      return value.trim()
    }

    if (typeof value === 'number' && Number.isFinite(value)) {
      return String(value)
    }
  }

  return ''
}

function getFirstTextValue(...values) {
  for (const value of values) {
    if (typeof value === 'string') {
      return value
    }

    if (typeof value === 'number' && Number.isFinite(value)) {
      return String(value)
    }
  }

  return ''
}

function getFirstArray(...values) {
  for (const value of values) {
    if (Array.isArray(value)) {
      return value
    }
  }

  return []
}

function getFirstNumber(...values) {
  for (const value of values) {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value
    }

    if (typeof value === 'string' && value.trim()) {
      const parsed = Number(value)

      if (Number.isFinite(parsed)) {
        return parsed
      }
    }
  }

  return null
}

function safeJsonParse(value) {
  if (typeof value !== 'string') {
    return null
  }

  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

function normalizeBoolean(value) {
  if (typeof value === 'boolean') {
    return value
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    return ['true', '1', 'yes', 'required'].includes(normalized)
  }

  if (typeof value === 'number') {
    return value === 1
  }

  return false
}

function normalizeChecklistStatus(value) {
  const normalized = getFirstString(value).toLowerCase()

  if (['completed', 'complete', 'done', 'finished'].includes(normalized)) {
    return 'completed'
  }

  return 'pending'
}

function normalizeChecklistItem(item) {
  if (!item || typeof item !== 'object') {
    return null
  }

  const taskId = getFirstString(item.taskId, item.task_id, item.id)
  const taskName = getFirstString(item.taskName, item.task_name, item.title, item.name)

  if (!taskId || !taskName) {
    return null
  }

  const orderNo = Number(item.orderNo ?? item.order_no ?? item.order)

  return {
    taskId,
    taskName,
    description: getFirstString(item.description, item.details, item.summary),
    status: normalizeChecklistStatus(item.status),
    dueDay: getFirstString(item.dueDay, item.due_day, item.dueLabel),
    required: normalizeBoolean(item.required),
    orderNo: Number.isFinite(orderNo) ? orderNo : null,
  }
}

function normalizeSupportContact(item) {
  if (!item || typeof item !== 'object') {
    return null
  }

  const name = getFirstString(item.name, item.fullName)

  if (!name) {
    return null
  }

  return {
    name,
    departmentName: getFirstString(item.departmentName, item.department_name),
    roleTitle: getFirstString(item.roleTitle, item.role_title, item.positionTitle),
    email: getFirstString(item.email),
    phone: getFirstString(item.phone),
    supportType: getFirstString(item.supportType, item.support_type),
  }
}

function normalizeQuizQuestionType(value, hasOptions = false) {
  const normalized = getFirstString(value).toLowerCase()

  if (['multiple_choice', 'multiple-choice', 'multiple choice', 'checkbox', 'checkboxes'].includes(normalized)) {
    return 'multiple_choice'
  }

  if (['single_choice', 'single-choice', 'single choice', 'radio', 'mcq', 'choice'].includes(normalized)) {
    return 'single_choice'
  }

  if (['boolean', 'true_false', 'true-false', 'true false', 'yes_no', 'yes-no'].includes(normalized)) {
    return 'boolean'
  }

  if (['text', 'short_text', 'short-text', 'open_text', 'open-text', 'free_text', 'free-text'].includes(normalized)) {
    return 'text'
  }

  return hasOptions ? 'single_choice' : 'text'
}

function normalizeQuizOptionValue(value, questionType) {
  if (questionType === 'boolean') {
    if (typeof value === 'boolean') {
      return value
    }

    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase()

      if (['true', '1', 'yes', 'y', 'dung', 'correct'].includes(normalized)) {
        return true
      }

      if (['false', '0', 'no', 'n', 'sai', 'incorrect'].includes(normalized)) {
        return false
      }
    }
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value)
  }

  return value
}

function normalizeQuizOption(option, index, questionType) {
  if (option === null || option === undefined) {
    return null
  }

  if (typeof option === 'string' || typeof option === 'number' || typeof option === 'boolean') {
    const value = normalizeQuizOptionValue(option, questionType)
    const label =
      typeof value === 'boolean'
        ? value
          ? 'Dung'
          : 'Sai'
        : String(value)

    return {
      id: `option-${index + 1}`,
      value,
      label,
    }
  }

  if (typeof option !== 'object' || Array.isArray(option)) {
    return null
  }

  const rawValue = option.value ?? option.id ?? option.code ?? option.key ?? option.label ?? option.text

  if (rawValue === null || rawValue === undefined || rawValue === '') {
    return null
  }

  const value = normalizeQuizOptionValue(rawValue, questionType)
  const label =
    getFirstString(option.label, option.text, option.title) ||
    (typeof value === 'boolean' ? (value ? 'Dung' : 'Sai') : String(value))

  return {
    id: getFirstString(option.id, option.key, option.code) || `option-${index + 1}`,
    value,
    label,
  }
}

function normalizeQuizQuestion(question) {
  if (!question || typeof question !== 'object' || Array.isArray(question)) {
    return null
  }

  const questionId = getFirstString(question.questionId, question.question_id, question.id)
  const prompt = getFirstString(
    question.prompt,
    question.questionText,
    question.question_text,
    question.title,
    question.label,
    question.text,
  )

  if (!questionId || !prompt) {
    return null
  }

  const rawOptions = getFirstArray(
    question.options,
    question.choices,
    question.answers,
    question.data?.options,
    question.data?.choices,
  )
  const type = normalizeQuizQuestionType(question.type ?? question.questionType ?? question.question_type, rawOptions.length > 0)
  const normalizedOptions = rawOptions
    .map((option, index) => normalizeQuizOption(option, index, type))
    .filter(Boolean)

  return {
    questionId,
    prompt,
    description: getFirstString(question.description, question.helpText, question.help_text, question.explanation),
    type,
    options:
      type === 'boolean' && normalizedOptions.length === 0
        ? [
            { id: 'true', value: true, label: 'Dung' },
            { id: 'false', value: false, label: 'Sai' },
          ]
        : normalizedOptions,
    required: question.required === undefined ? true : normalizeBoolean(question.required),
    orderNo: getFirstNumber(question.orderNo, question.order_no, question.order),
  }
}

function normalizeQuizResult(result) {
  if (!result || typeof result !== 'object' || Array.isArray(result)) {
    return null
  }

  const score = getFirstNumber(result.score, result.totalScore, result.result?.score)
  const maxScore = getFirstNumber(result.maxScore, result.max_score, result.totalPossibleScore)
  const durationSeconds = getFirstNumber(result.durationSeconds, result.duration_seconds)
  const submittedAt = getFirstString(result.submittedAt, result.submitted_at, result.completedAt, result.completed_at)
  const attemptId = getFirstString(result.attemptId, result.attempt_id, result.id)
  const quizId = getFirstString(result.quizId, result.quiz_id, result.templateId, result.template_id)
  const summary = getFirstString(result.summary, result.message, result.feedback)

  if (!attemptId && !quizId && score === null && maxScore === null && durationSeconds === null && !submittedAt && !summary) {
    return null
  }

  return {
    attemptId,
    quizId,
    score,
    maxScore,
    durationSeconds,
    submittedAt,
    summary,
  }
}

function isChecklistPayloadType(type) {
  return ['checklist', 'onboarding-checklist', 'onboarding_checklist', 'tasks'].includes(type)
}

function isSupportContactsPayloadType(type) {
  return [
    'support-contacts',
    'support_contacts',
    'contacts',
    'support-directory',
    'support_directory',
  ].includes(type)
}

function isQuizPayloadType(type) {
  return ['quiz', 'mini-quiz', 'mini_quiz', 'training-quiz', 'training_quiz'].includes(type)
}

function isLearningPathPayloadType(type) {
  return ['learning-path', 'learning_path', 'roadmap', 'learning-roadmap', 'learning_roadmap'].includes(type)
}

function isAnalyticsSummaryPayloadType(type) {
  return [
    'analytics-summary',
    'analytics_summary',
    'department-summary',
    'department_summary',
    'training-analytics-summary',
    'training_analytics_summary',
  ].includes(type)
}

function normalizeAnalyticsSentimentBreakdown(breakdown) {
  if (!breakdown || typeof breakdown !== 'object' || Array.isArray(breakdown)) {
    return null
  }

  const positive = getFirstNumber(breakdown.positive, breakdown.positiveCount, breakdown.positive_count)
  const neutral = getFirstNumber(breakdown.neutral, breakdown.neutralCount, breakdown.neutral_count)
  const negative = getFirstNumber(breakdown.negative, breakdown.negativeCount, breakdown.negative_count)

  if (positive === null && neutral === null && negative === null) {
    return null
  }

  return {
    positive: positive ?? 0,
    neutral: neutral ?? 0,
    negative: negative ?? 0,
  }
}

function normalizeLearningPathItem(item) {
  if (!item || typeof item !== 'object' || Array.isArray(item)) {
    return null
  }

  const courseId = getFirstString(item.courseId, item.course_id, item.id)
  const courseTitle = getFirstString(item.courseTitle, item.course_title, item.title, item.name)

  if (!courseId || !courseTitle) {
    return null
  }

  return {
    orderNo: getFirstNumber(item.orderNo, item.order_no, item.order) ?? Number.MAX_SAFE_INTEGER,
    courseId,
    courseCode: getFirstString(item.courseCode, item.course_code, item.code),
    courseTitle,
    required: normalizeBoolean(item.required),
    reason: getFirstString(item.reason, item.summary, item.description),
    estimatedHours: getFirstNumber(item.estimatedHours, item.estimated_hours, item.durationHours, item.duration_hours),
    status: getFirstString(item.status) || 'not_started',
  }
}

export function normalizeUiPayload(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return null
  }

  const payloadType = getFirstString(
    payload.type,
    payload.uiType,
    payload.kind,
    payload.component,
    payload.cardType,
    payload.widget,
  ).toLowerCase()

  const checklistItems = getFirstArray(
    payload.tasks,
    payload.items,
    payload.checklist,
    payload.taskList,
    payload.data?.tasks,
    payload.data?.items,
    payload.data?.checklist,
  )
    .map(normalizeChecklistItem)
    .filter(Boolean)

  if (isChecklistPayloadType(payloadType) || checklistItems.length > 0) {
    if (checklistItems.length === 0) {
      return null
    }

    const items = [...checklistItems].sort((left, right) => {
      const leftOrder = left.orderNo ?? Number.MAX_SAFE_INTEGER
      const rightOrder = right.orderNo ?? Number.MAX_SAFE_INTEGER
      return leftOrder - rightOrder
    })

    return {
      type: 'checklist',
      title: getFirstString(payload.title, payload.heading, payload.label) || 'Onboarding checklist',
      description: getFirstString(payload.description, payload.summary, payload.subtitle),
      items,
    }
  }

  const contacts = getFirstArray(
    payload.contacts,
    payload.items,
    payload.supportContacts,
    payload.directory,
    payload.data?.contacts,
    payload.data?.items,
    payload.data?.supportContacts,
  )
    .map(normalizeSupportContact)
    .filter(Boolean)

  if (isSupportContactsPayloadType(payloadType) || contacts.length > 0) {
    if (contacts.length === 0) {
      return null
    }

    return {
      type: 'support-contacts',
      title: getFirstString(payload.title, payload.heading, payload.label) || 'Support contacts',
      description: getFirstString(payload.description, payload.summary, payload.subtitle),
      items: contacts,
    }
  }

  const questions = getFirstArray(
    payload.questions,
    payload.items,
    payload.quiz?.questions,
    payload.data?.questions,
    payload.data?.items,
    payload.data?.quiz?.questions,
  )
    .map(normalizeQuizQuestion)
    .filter(Boolean)

  const result = normalizeQuizResult(
    payload.result ??
      payload.quizResult ??
      payload.resultSummary ??
      payload.latestResult ??
      payload.attempt ??
      payload.submission ??
      payload.data?.result ??
      payload.data?.quizResult ??
      payload.data?.resultSummary,
  )

  if (isQuizPayloadType(payloadType) || questions.length > 0 || result) {
    const quizId = getFirstString(
      payload.quizId,
      payload.quiz_id,
      payload.id,
      payload.templateId,
      payload.template_id,
      payload.quiz?.id,
      payload.data?.quizId,
      payload.data?.quiz_id,
      result?.quizId,
    )

    if (!quizId) {
      return null
    }

    const items = [...questions].sort((left, right) => {
      const leftOrder = left.orderNo ?? Number.MAX_SAFE_INTEGER
      const rightOrder = right.orderNo ?? Number.MAX_SAFE_INTEGER
      return leftOrder - rightOrder
    })

    return {
      type: 'quiz',
      version: getFirstString(
        payload.version,
        payload.uiVersion,
        payload.schemaVersion,
        payload.schema_version,
        payload.payloadVersion,
        payload.data?.version,
      ) || '1',
      quizId,
      title: getFirstString(payload.title, payload.heading, payload.label) || 'Mini quiz',
      description: getFirstString(payload.description, payload.summary, payload.subtitle),
      contextLabel: getFirstString(
        payload.contextLabel,
        payload.context_label,
        payload.skillName,
        payload.skill_name,
        payload.courseTitle,
        payload.course_title,
        payload.topic,
        payload.data?.contextLabel,
      ),
      difficulty: getFirstString(payload.difficulty, payload.level, payload.data?.difficulty),
      questionCount: items.length || getFirstNumber(payload.questionCount, payload.question_count) || 0,
      submitLabel: getFirstString(payload.submitLabel, payload.ctaLabel, payload.actionLabel) || 'Nop bai',
      items,
      result,
    }
  }

  const learningPathItems = getFirstArray(
    payload.items,
    payload.pathItems,
    payload.learningPath,
    payload.roadmap,
    payload.data?.items,
    payload.data?.pathItems,
    payload.data?.learningPath,
  )
    .map(normalizeLearningPathItem)
    .filter(Boolean)

  if (isLearningPathPayloadType(payloadType) || learningPathItems.length > 0) {
    const pathId = getFirstString(
      payload.pathId,
      payload.path_id,
      payload.learningPathId,
      payload.learning_path_id,
      payload.id,
      payload.data?.pathId,
    )

    if (!pathId || learningPathItems.length === 0) {
      return null
    }

    const items = [...learningPathItems].sort((left, right) => left.orderNo - right.orderNo)

    return {
      type: 'learning-path',
      version: getFirstString(
        payload.version,
        payload.uiVersion,
        payload.schemaVersion,
        payload.schema_version,
        payload.payloadVersion,
        payload.data?.version,
      ) || '1',
      pathId,
      title: getFirstString(payload.title, payload.heading, payload.label) || 'Learning path',
      description: getFirstString(payload.description, payload.summary, payload.subtitle),
      contextLabel: getFirstString(payload.contextLabel, payload.context_label, payload.skillGap, payload.skill_gap),
      generated: payload.generated === undefined ? true : normalizeBoolean(payload.generated),
      summary: getFirstString(payload.summary, payload.nextStepLabel, payload.next_step_label),
      items,
    }
  }

  const sentimentBreakdown = normalizeAnalyticsSentimentBreakdown(
    payload.sentimentBreakdown ??
      payload.sentiment_breakdown ??
      payload.sentiment ??
      payload.data?.sentimentBreakdown ??
      payload.data?.sentiment_breakdown,
  )

  if (isAnalyticsSummaryPayloadType(payloadType) || sentimentBreakdown) {
    const title = getFirstString(payload.title, payload.heading, payload.label)
    const departmentName = getFirstString(
      payload.departmentName,
      payload.department_name,
      payload.department,
      payload.departmentLabel,
      payload.department_label,
      payload.data?.departmentName,
      payload.data?.department_name,
    )
    const periodLabel = getFirstString(
      payload.periodLabel,
      payload.period_label,
      payload.period,
      payload.rangeLabel,
      payload.range_label,
      payload.data?.periodLabel,
      payload.data?.period_label,
    )
    const completionRate = getFirstNumber(
      payload.completionRate,
      payload.completion_rate,
      payload.data?.completionRate,
      payload.data?.completion_rate,
    )

    if (!title || !departmentName || !periodLabel || completionRate === null || !sentimentBreakdown) {
      return null
    }

    return {
      type: 'analytics-summary',
      title,
      departmentName,
      periodLabel,
      completionRate,
      sentimentBreakdown,
      sentimentLabel: getFirstString(
        payload.sentimentLabel,
        payload.sentiment_label,
        payload.summaryLabel,
        payload.summary_label,
        payload.data?.sentimentLabel,
        payload.data?.sentiment_label,
      ),
      generatedAt: getFirstString(
        payload.generatedAt,
        payload.generated_at,
        payload.createdAt,
        payload.created_at,
        payload.data?.generatedAt,
        payload.data?.generated_at,
      ),
    }
  }

  return null
}

function extractUiPayloadFromText(content) {
  if (typeof content !== 'string' || !content.trim()) {
    return { content: content || '', uiPayload: null }
  }

  for (const pattern of UI_PAYLOAD_PATTERNS) {
    const match = content.match(pattern)

    if (!match) {
      continue
    }

    const markerText = match[0]
    const fallbackContent = content.replace(markerText, match[1]?.trim() || '').trim()

    const candidatePayload = normalizeUiPayload(safeJsonParse(match[1]?.trim()))

    if (!candidatePayload) {
      return {
        content: fallbackContent,
        uiPayload: null,
      }
    }

    const displayText = content.replace(markerText, '').trim()

    return {
      content: displayText,
      uiPayload: candidatePayload,
    }
  }

  return {
    content,
    uiPayload: null,
  }
}

function readExplicitUiPayload(source) {
  return normalizeUiPayload(
    source?.uiPayload ??
      source?.ui_payload ??
      source?.metadata?.uiPayload ??
      source?.metadata?.ui_payload ??
      source?.data?.uiPayload ??
      source?.data?.ui_payload,
  )
}

export function normalizeChatMessage(message) {
  const rawContent = typeof message?.rawContent === 'string'
    ? message.rawContent
    : typeof message?.content === 'string'
      ? message.content
      : ''

  const explicitUiPayload = readExplicitUiPayload(message)
  const extractedFromText = extractUiPayloadFromText(rawContent)
  const extracted = explicitUiPayload
    ? {
        content: extractedFromText.content,
        uiPayload: explicitUiPayload,
      }
    : extractedFromText

  return {
    ...message,
    content: extracted.content,
    rawContent,
    uiPayload: extracted.uiPayload,
  }
}

function normalizeStreamEvent(eventData) {
  const explicitUiPayload = readExplicitUiPayload(eventData)
  const textChunk = getFirstTextValue(
    eventData?.data?.chunk,
    eventData?.chunk,
    eventData?.data?.text,
    eventData?.text,
    eventData?.data?.content,
    eventData?.content,
  )

  if (explicitUiPayload) {
    return {
      textChunk,
      uiPayload: explicitUiPayload,
    }
  }

  if (!textChunk) {
    return {
      textChunk: '',
      uiPayload: null,
    }
  }

  const extracted = extractUiPayloadFromText(textChunk)

  return {
    textChunk: extracted.content,
    uiPayload: extracted.uiPayload,
  }
}

function normalizeChatMessages(messages) {
  if (!Array.isArray(messages)) {
    return []
  }

  return messages.map(normalizeChatMessage)
}

export const chatService = {
  getConversations: async () => {
    const response = await apiClient.get('/api/chat/conversations')
    return response.data
  },

  getMessages: async (conversationId) => {
    const response = await apiClient.get(`/api/chat/conversations/${conversationId}/messages`)
    const payload = Array.isArray(response.data) ? response.data : response.data?.data
    return normalizeChatMessages(payload)
  },

  sendMessageStream: async (message, sessionKey, onEvent) => {
    const session = useAuthStore.getState().session
    const token = session?.tokens?.userAccessToken

    const response = await fetch('/api/chat/message', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ message, sessionKey }),
    })

    if (!response.ok) {
      throw new Error(`Chat API error: ${response.statusText}`)
    }

    if (!response.body) {
      throw new Error('Chat API error: response body is missing')
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    const processBuffer = (flush = false) => {
      const normalized = flush ? buffer : buffer.replace(/\r\n/g, '\n')
      const segments = normalized.split('\n\n')
      buffer = flush ? '' : segments.pop() || ''

      for (const segment of segments) {
        const dataLines = segment
          .split('\n')
          .filter((line) => line.startsWith('data:'))
          .map((line) => line.slice(5).trimStart())

        if (dataLines.length === 0) {
          continue
        }

        const jsonStr = dataLines.join('\n')

        if (jsonStr === '[DONE]') {
          continue
        }

        try {
          const eventData = JSON.parse(jsonStr)
          const normalizedEvent = normalizeStreamEvent(eventData)

          if (normalizedEvent.textChunk) {
            onEvent({
              type: 'text',
              chunk: normalizedEvent.textChunk,
            })
          }

          if (normalizedEvent.uiPayload) {
            onEvent({
              type: 'ui-payload',
              uiPayload: normalizedEvent.uiPayload,
            })
          }
        } catch (error) {
          console.error('Error parsing SSE data', error)
        }
      }
    }

    while (true) {
      const { value, done } = await reader.read()

      if (done) {
        buffer += decoder.decode()
        processBuffer(true)
        break
      }

      buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, '\n')
      processBuffer()
    }
  },
}
