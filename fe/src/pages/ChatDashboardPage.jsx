import { useEffect, useEffectEvent, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '../store/authStore'
import { chatService, normalizeChatMessage } from '../services/chatService'
import { onboardingService } from '../services/onboardingService'
import { trainingService } from '../services/trainingService'

const SUGGESTED_PROMPTS = [
  'Toi phai lam gi vao ngay dau?',
  'Xem quy dinh cua cong ty',
  'Hom nay toi can lien he ai ve IT?',
  'Toi nen hoc khoa nao truoc?',
]

function formatConversationLabel(conversation, fallbackMessages = []) {
  const explicitPreview =
    conversation.preview ||
    conversation.title ||
    fallbackMessages.find((message) => message.content?.trim())?.content

  if (explicitPreview) {
    return explicitPreview
  }

  return `Conversation ${conversation.id.slice(0, 8)}`
}

function getChecklistStatusLabel(status) {
  return status === 'completed' ? 'Hoan thanh' : 'Dang cho'
}

function getChecklistButtonLabel(isCompleted, isSubmitting) {
  if (isSubmitting) {
    return 'Dang cap nhat...'
  }

  return isCompleted ? 'Da hoan thanh' : 'Danh dau hoan thanh'
}

function formatQuizScore(result) {
  if (!result || result.score === null || result.score === undefined) {
    return null
  }

  if (result.maxScore !== null && result.maxScore !== undefined) {
    return `${result.score}/${result.maxScore}`
  }

  return String(result.score)
}

function formatDurationLabel(durationSeconds) {
  if (typeof durationSeconds !== 'number' || !Number.isFinite(durationSeconds) || durationSeconds <= 0) {
    return null
  }

  if (durationSeconds < 60) {
    return `${durationSeconds}s`
  }

  const minutes = Math.floor(durationSeconds / 60)
  const seconds = durationSeconds % 60

  if (seconds === 0) {
    return `${minutes}m`
  }

  return `${minutes}m ${seconds}s`
}

function buildQuizInitialAnswers(payload) {
  return payload.items.reduce((accumulator, question) => {
    if (question.type === 'multiple_choice') {
      accumulator[question.questionId] = []
      return accumulator
    }

    accumulator[question.questionId] = ''
    return accumulator
  }, {})
}

function normalizeAnswerForSubmission(question, answer) {
  if (question.type === 'multiple_choice') {
    return Array.isArray(answer) ? answer : []
  }

  if (question.type === 'boolean') {
    return answer === true || answer === false ? answer : ''
  }

  if (typeof answer === 'string') {
    return answer.trim()
  }

  return answer ?? ''
}

function hasAnswerValue(question, answer) {
  if (question.type === 'multiple_choice') {
    return Array.isArray(answer) && answer.length > 0
  }

  if (question.type === 'boolean') {
    return answer === true || answer === false
  }

  return typeof answer === 'string' ? Boolean(answer.trim()) : Boolean(answer)
}

function buildQuizSubmissionAnswers(payload, answers) {
  return payload.items.map((question) => ({
    questionId: question.questionId,
    answer: normalizeAnswerForSubmission(question, answers[question.questionId]),
  }))
}

function QuizQuestionField({ question, value, disabled, onChange }) {
  if (question.type === 'multiple_choice') {
    const selectedValues = Array.isArray(value) ? value : []

    return (
      <div className="chat-quiz-option-list" role="group" aria-label={question.prompt}>
        {question.options.map((option) => {
          const checked = selectedValues.includes(option.value)

          return (
            <label key={option.id} className="chat-quiz-option">
              <input
                type="checkbox"
                checked={checked}
                disabled={disabled}
                onChange={(event) => {
                  const nextValue = event.target.checked
                    ? [...selectedValues, option.value]
                    : selectedValues.filter((entry) => entry !== option.value)

                  onChange(nextValue)
                }}
              />
              <span>{option.label}</span>
            </label>
          )
        })}
      </div>
    )
  }

  if (question.type === 'boolean' || question.type === 'single_choice') {
    return (
      <div className="chat-quiz-option-list" role="radiogroup" aria-label={question.prompt}>
        {question.options.map((option) => {
          const checked = value === option.value

          return (
            <label key={option.id} className="chat-quiz-option">
              <input
                type="radio"
                name={`quiz-question-${question.questionId}`}
                checked={checked}
                disabled={disabled}
                onChange={() => onChange(option.value)}
              />
              <span>{option.label}</span>
            </label>
          )
        })}
      </div>
    )
  }

  return (
    <textarea
      className="field-control chat-quiz-textarea"
      value={typeof value === 'string' ? value : ''}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value)}
      rows={3}
      placeholder="Nhap cau tra loi ngan"
    />
  )
}

function QuizResultSummary({ result }) {
  const scoreLabel = formatQuizScore(result)
  const durationLabel = formatDurationLabel(result?.durationSeconds)
  const submittedLabel = result?.submittedAt
    ? new Date(result.submittedAt).toLocaleString()
    : null

  return (
    <section className="chat-quiz-result" aria-live="polite">
      <div className="chat-ui-card__header">
        <div>
          <p className="section-tag chat-ui-card__eyebrow">Ket qua</p>
          <h4 className="chat-checklist-item__title">Da nop bai</h4>
        </div>
        {scoreLabel ? <span className="chat-status-pill chat-status-pill--success">Diem {scoreLabel}</span> : null}
      </div>

      <div className="chat-meta-pill-row">
        {durationLabel ? <span className="chat-meta-pill">Thoi gian {durationLabel}</span> : null}
        {submittedLabel ? <span className="chat-meta-pill">Nop luc {submittedLabel}</span> : null}
        {result?.attemptId ? <span className="chat-meta-pill">Attempt #{result.attemptId}</span> : null}
      </div>

      {result?.summary ? <p className="chat-ui-card__copy">{result.summary}</p> : null}
    </section>
  )
}

function formatEstimatedHours(hours) {
  if (typeof hours !== 'number' || !Number.isFinite(hours) || hours <= 0) {
    return null
  }

  return `${hours}h`
}

function formatPercentage(value) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return null
  }

  return `${Math.round(value)}%`
}

function formatGeneratedAt(value) {
  if (!value) {
    return null
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return null
  }

  return date.toLocaleString()
}

function getSentimentTone(summary) {
  if (!summary?.sentimentLabel) {
    return ''
  }

  const normalized = summary.sentimentLabel.trim().toLowerCase()

  if (normalized.includes('positive') || normalized.includes('tich cuc')) {
    return 'chat-status-pill--success'
  }

  if (normalized.includes('negative') || normalized.includes('tieu cuc')) {
    return 'chat-status-pill--danger'
  }

  return ''
}

function AnalyticsSummaryCard({ payload }) {
  const completionRateLabel = formatPercentage(payload.completionRate)
  const generatedAtLabel = formatGeneratedAt(payload.generatedAt)
  const sentimentToneClassName = getSentimentTone(payload)

  return (
    <div className="chat-ui-card chat-ui-card--analytics-summary">
      <div className="chat-ui-card__header">
        <div>
          <p className="section-tag chat-ui-card__eyebrow">Analytics summary</p>
          <h3 className="chat-ui-card__title">{payload.title}</h3>
        </div>
        {completionRateLabel ? <span className="chat-ui-card__count">{completionRateLabel}</span> : null}
      </div>

      <div className="chat-meta-pill-row">
        <span className="chat-meta-pill">{payload.departmentName}</span>
        <span className="chat-meta-pill">{payload.periodLabel}</span>
        {generatedAtLabel ? <span className="chat-meta-pill">Cap nhat {generatedAtLabel}</span> : null}
      </div>

      <div className="chat-analytics-summary-grid">
        <article className="chat-analytics-summary-stat">
          <p className="section-tag chat-ui-card__eyebrow">Completion</p>
          <strong className="chat-analytics-summary-stat__value">{completionRateLabel ?? '—'}</strong>
          <p className="chat-ui-card__copy">Ty le hoan thanh dao tao trong ky nay.</p>
        </article>

        <article className="chat-analytics-summary-stat">
          <div className="chat-analytics-summary-stat__header">
            <p className="section-tag chat-ui-card__eyebrow">Sentiment</p>
            {payload.sentimentLabel ? (
              <span
                className={
                  sentimentToneClassName
                    ? `chat-status-pill ${sentimentToneClassName}`
                    : 'chat-status-pill'
                }
              >
                {payload.sentimentLabel}
              </span>
            ) : null}
          </div>

          <div className="chat-analytics-sentiment-list" aria-label="Sentiment breakdown">
            <div className="chat-analytics-sentiment-item">
              <span className="chat-meta-pill">Positive</span>
              <strong className="chat-analytics-summary-stat__metric">{payload.sentimentBreakdown.positive}</strong>
            </div>
            <div className="chat-analytics-sentiment-item">
              <span className="chat-meta-pill">Neutral</span>
              <strong className="chat-analytics-summary-stat__metric">{payload.sentimentBreakdown.neutral}</strong>
            </div>
            <div className="chat-analytics-sentiment-item">
              <span className="chat-meta-pill">Negative</span>
              <strong className="chat-analytics-summary-stat__metric">{payload.sentimentBreakdown.negative}</strong>
            </div>
          </div>
        </article>
      </div>
    </div>
  )
}

function ChecklistCard({ payload, completingTaskIds, taskErrors, onCompleteTask }) {
  return (
    <div className="chat-ui-card chat-ui-card--checklist">
      <div className="chat-ui-card__header">
        <div>
          <p className="section-tag chat-ui-card__eyebrow">Onboarding checklist</p>
          <h3 className="chat-ui-card__title">{payload.title}</h3>
        </div>
        <span className="chat-ui-card__count">{payload.items.length} muc</span>
      </div>

      {payload.description ? <p className="chat-ui-card__copy">{payload.description}</p> : null}

      <div className="chat-checklist-grid">
        {payload.items.map((task, index) => {
          const isCompleted = task.status === 'completed'
          const isSubmitting = Boolean(completingTaskIds[task.taskId])
          const taskError = taskErrors[task.taskId]

          return (
            <article
              key={task.taskId}
              className={
                isCompleted
                  ? 'chat-checklist-item chat-checklist-item--completed'
                  : 'chat-checklist-item'
              }
            >
              <div className="chat-checklist-item__header">
                <span className="chat-checklist-item__order">
                  {(task.orderNo ?? index + 1).toString().padStart(2, '0')}
                </span>
                <span
                  className={
                    isCompleted
                      ? 'chat-status-pill chat-status-pill--success'
                      : 'chat-status-pill'
                  }
                >
                  {getChecklistStatusLabel(task.status)}
                </span>
              </div>

              <div className="chat-checklist-item__body">
                <div>
                  <h4 className="chat-checklist-item__title">{task.taskName}</h4>
                  {task.description ? (
                    <p className="chat-checklist-item__copy">{task.description}</p>
                  ) : null}
                </div>

                <div className="chat-meta-pill-row">
                  {task.dueDay ? <span className="chat-meta-pill">Due: {task.dueDay}</span> : null}
                  {task.required ? <span className="chat-meta-pill">Bat buoc</span> : null}
                </div>
              </div>

              <button
                type="button"
                className="chat-task-action"
                onClick={() => onCompleteTask(task.taskId)}
                disabled={isCompleted || isSubmitting}
              >
                {getChecklistButtonLabel(isCompleted, isSubmitting)}
              </button>

              {taskError ? <p className="chat-inline-error">{taskError}</p> : null}
            </article>
          )
        })}
      </div>
    </div>
  )
}

function QuizCard({
  message,
  payload,
  quizDrafts,
  quizSubmittingState,
  quizErrors,
  onAnswerChange,
  onSubmitQuiz,
}) {
  const draftKey = message.id || payload.quizId
  const answers = quizDrafts[draftKey] || buildQuizInitialAnswers(payload)
  const isSubmitting = Boolean(quizSubmittingState[draftKey])
  const submitError = quizErrors[draftKey]
  const hasResult = Boolean(payload.result)

  return (
    <div className="chat-ui-card chat-ui-card--quiz">
      <div className="chat-ui-card__header">
        <div>
          <p className="section-tag chat-ui-card__eyebrow">Mini quiz</p>
          <h3 className="chat-ui-card__title">{payload.title}</h3>
        </div>
        <span className="chat-ui-card__count">{payload.questionCount || payload.items.length} cau</span>
      </div>

      {payload.description ? <p className="chat-ui-card__copy">{payload.description}</p> : null}

      <div className="chat-meta-pill-row">
        {payload.contextLabel ? <span className="chat-meta-pill">{payload.contextLabel}</span> : null}
        {payload.difficulty ? <span className="chat-meta-pill">{payload.difficulty}</span> : null}
        {payload.version ? <span className="chat-meta-pill">v{payload.version}</span> : null}
      </div>

      <div className="chat-quiz-question-list">
        {payload.items.map((question, index) => (
          <article key={question.questionId} className="chat-quiz-question-card">
            <div className="chat-checklist-item__header">
              <span className="chat-checklist-item__order">{String(index + 1).padStart(2, '0')}</span>
              <span className="chat-meta-pill">{question.type.replace('_', ' ')}</span>
            </div>

            <div className="chat-checklist-item__body">
              <div>
                <h4 className="chat-checklist-item__title">{question.prompt}</h4>
                {question.description ? <p className="chat-checklist-item__copy">{question.description}</p> : null}
              </div>

              {hasResult ? (
                <div className="chat-quiz-answer-pill">
                  <span className="chat-meta-pill">Da nop</span>
                  <p className="chat-ui-card__copy">Da gui cau tra loi</p>
                </div>
              ) : (
                <QuizQuestionField
                  question={question}
                  value={answers[question.questionId]}
                  disabled={isSubmitting}
                  onChange={(nextValue) => onAnswerChange(draftKey, question.questionId, nextValue)}
                />
              )}
            </div>
          </article>
        ))}
      </div>

      {submitError ? <p className="chat-inline-error">{submitError}</p> : null}

      {hasResult ? <QuizResultSummary result={payload.result} /> : null}

      {!hasResult ? (
        <button
          type="button"
          className="chat-task-action"
          onClick={() => onSubmitQuiz(message, payload)}
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Dang nop bai...' : payload.submitLabel}
        </button>
      ) : null}
    </div>
  )
}

function LearningPathCard({ payload }) {
  return (
    <div className="chat-ui-card chat-ui-card--learning-path">
      <div className="chat-ui-card__header">
        <div>
          <p className="section-tag chat-ui-card__eyebrow">Learning path</p>
          <h3 className="chat-ui-card__title">{payload.title}</h3>
        </div>
        <span className="chat-ui-card__count">{payload.items.length} khoa hoc</span>
      </div>

      {payload.description ? <p className="chat-ui-card__copy">{payload.description}</p> : null}

      <div className="chat-meta-pill-row">
        {payload.contextLabel ? <span className="chat-meta-pill">{payload.contextLabel}</span> : null}
        {payload.generated ? <span className="chat-meta-pill">Ca nhan hoa</span> : null}
        {payload.version ? <span className="chat-meta-pill">v{payload.version}</span> : null}
      </div>

      <div className="chat-checklist-grid">
        {payload.items.map((item, index) => (
          <article key={`${item.courseId}-${index}`} className="chat-checklist-item">
            <div className="chat-checklist-item__header">
              <span className="chat-checklist-item__order">
                {String(item.orderNo ?? index + 1).padStart(2, '0')}
              </span>
              <span className={item.required ? 'chat-status-pill chat-status-pill--success' : 'chat-status-pill'}>
                {item.required ? 'Bat buoc' : 'De xuat'}
              </span>
            </div>

            <div className="chat-checklist-item__body">
              <div>
                <h4 className="chat-checklist-item__title">{item.courseTitle}</h4>
                {item.reason ? <p className="chat-checklist-item__copy">{item.reason}</p> : null}
              </div>

              <div className="chat-meta-pill-row">
                {item.courseCode ? <span className="chat-meta-pill">{item.courseCode}</span> : null}
                {formatEstimatedHours(item.estimatedHours) ? (
                  <span className="chat-meta-pill">{formatEstimatedHours(item.estimatedHours)}</span>
                ) : null}
                {item.status ? <span className="chat-meta-pill">{item.status}</span> : null}
              </div>
            </div>
          </article>
        ))}
      </div>

      {payload.summary ? <p className="chat-ui-card__copy">{payload.summary}</p> : null}
    </div>
  )
}

function SupportContactsCard({ payload }) {
  return (
    <div className="chat-ui-card chat-ui-card--contacts">
      <div className="chat-ui-card__header">
        <div>
          <p className="section-tag chat-ui-card__eyebrow">Support contacts</p>
          <h3 className="chat-ui-card__title">{payload.title}</h3>
        </div>
        <span className="chat-ui-card__count">{payload.items.length} lien he</span>
      </div>

      {payload.description ? <p className="chat-ui-card__copy">{payload.description}</p> : null}

      <div className="chat-contact-grid">
        {payload.items.map((contact) => (
          <article key={`${contact.name}-${contact.email}-${contact.phone}`} className="chat-contact-card">
            <div className="chat-contact-card__header">
              <div>
                <h4 className="chat-contact-card__name">{contact.name}</h4>
                <p className="chat-contact-card__meta">
                  {[contact.roleTitle, contact.departmentName].filter(Boolean).join(' • ') || 'Support team'}
                </p>
              </div>
              {contact.supportType ? <span className="chat-meta-pill">{contact.supportType}</span> : null}
            </div>

            <div className="chat-contact-card__details">
              {contact.email ? (
                <a className="chat-contact-link" href={`mailto:${contact.email}`}>
                  {contact.email}
                </a>
              ) : null}
              {contact.phone ? (
                <a className="chat-contact-link" href={`tel:${contact.phone}`}>
                  {contact.phone}
                </a>
              ) : null}
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}

function StructuredAssistantContent({
  message,
  completingTaskIds,
  taskErrors,
  onCompleteTask,
  quizDrafts,
  quizSubmittingState,
  quizErrors,
  onQuizAnswerChange,
  onSubmitQuiz,
  isPending,
}) {
  const hasText = Boolean(message.content?.trim())
  const fallbackText = !hasText && isPending ? '...' : message.content

  return (
    <>
      {hasText || fallbackText ? <p className="chat-message-text">{fallbackText}</p> : null}

      {message.uiPayload?.type === 'checklist' ? (
        <ChecklistCard
          payload={message.uiPayload}
          completingTaskIds={completingTaskIds}
          taskErrors={taskErrors}
          onCompleteTask={onCompleteTask}
        />
      ) : null}

      {message.uiPayload?.type === 'support-contacts' ? (
        <SupportContactsCard payload={message.uiPayload} />
      ) : null}

      {message.uiPayload?.type === 'quiz' ? (
        <QuizCard
          message={message}
          payload={message.uiPayload}
          quizDrafts={quizDrafts}
          quizSubmittingState={quizSubmittingState}
          quizErrors={quizErrors}
          onAnswerChange={onQuizAnswerChange}
          onSubmitQuiz={onSubmitQuiz}
        />
      ) : null}

      {message.uiPayload?.type === 'learning-path' ? (
        <LearningPathCard payload={message.uiPayload} />
      ) : null}

      {message.uiPayload?.type === 'analytics-summary' ? (
        <AnalyticsSummaryCard payload={message.uiPayload} />
      ) : null}
    </>
  )
}

function ChatMessageBubble({
  message,
  index,
  isBusy,
  messagesLength,
  completingTaskIds,
  taskErrors,
  onCompleteTask,
  quizDrafts,
  quizSubmittingState,
  quizErrors,
  onQuizAnswerChange,
  onSubmitQuiz,
}) {
  const isUser = message.sender_type === 'user'
  const isAssistant = message.sender_type === 'assistant'
  const isPending = isBusy && index === messagesLength - 1
  const rowClassName = isUser ? 'chat-message-row chat-message-row--user' : 'chat-message-row'
  const bubbleClassName = isUser
    ? 'chat-message-bubble chat-message-bubble--user'
    : message.sender_type === 'system'
      ? 'chat-message-bubble chat-message-bubble--system'
      : 'chat-message-bubble'

  return (
    <div className={rowClassName}>
      <div className={bubbleClassName}>
        {isAssistant ? (
          <StructuredAssistantContent
            message={message}
            completingTaskIds={completingTaskIds}
            taskErrors={taskErrors}
            onCompleteTask={onCompleteTask}
            quizDrafts={quizDrafts}
            quizSubmittingState={quizSubmittingState}
            quizErrors={quizErrors}
            onQuizAnswerChange={onQuizAnswerChange}
            onSubmitQuiz={onSubmitQuiz}
            isPending={isPending}
          />
        ) : (
          <p className="chat-message-text">
            {message.content || (isPending ? '...' : '')}
          </p>
        )}
      </div>
    </div>
  )
}

function getTaskCompletionError(error) {
  return (
    error?.response?.data?.error?.message ??
    error?.message ??
    'Khong the cap nhat checklist luc nay. Vui long thu lai.'
  )
}

function getQuizSubmissionError(error) {
  return (
    error?.response?.data?.error?.message ??
    error?.message ??
    'Khong the nop quiz luc nay. Vui long thu lai.'
  )
}

export function ChatDashboardPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const session = useAuthStore((state) => state.session)
  const clearSession = useAuthStore((state) => state.clearSession)
  const user = session?.user
  const isAdmin = user?.roleCode === 'admin' || user?.roleCode === 'security_admin'

  const [messages, setMessages] = useState([])
  const [inputValue, setInputValue] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [currentConversationId, setCurrentConversationId] = useState(null)
  const [sessionKey, setSessionKey] = useState(`session-${user?.id}-${Date.now()}`)
  const [queuedPrompt, setQueuedPrompt] = useState(null)
  const [completingTaskIds, setCompletingTaskIds] = useState({})
  const [taskErrors, setTaskErrors] = useState({})
  const [quizDrafts, setQuizDrafts] = useState({})
  const [quizSubmittingState, setQuizSubmittingState] = useState({})
  const [quizErrors, setQuizErrors] = useState({})
  const messagesEndRef = useRef(null)

  const submitQueuedPrompt = useEffectEvent(async (prompt) => {
    await sendMessage(prompt)
    setQueuedPrompt(null)
    setInputValue('')
  })

  const { data: conversations = [], isLoading: isLoadingConversations } = useQuery({
    queryKey: ['conversations'],
    queryFn: chatService.getConversations,
    enabled: !!user,
  })

  const {
    data: conversationMessages = [],
    isFetching: isFetchingConversationMessages,
    isFetched: hasFetchedConversationMessages,
  } = useQuery({
    queryKey: ['conversation-messages', currentConversationId],
    queryFn: () => chatService.getMessages(currentConversationId),
    enabled: Boolean(currentConversationId),
  })

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (!currentConversationId || !hasFetchedConversationMessages) {
      return
    }

    setMessages(conversationMessages)
  }, [conversationMessages, currentConversationId, hasFetchedConversationMessages])

  useEffect(() => {
    if (!queuedPrompt) {
      return
    }

    submitQueuedPrompt(queuedPrompt)
  }, [queuedPrompt])

  function handleLogout() {
    clearSession()
    navigate('/', { replace: true })
  }

  function handleNewChat() {
    setMessages([])
    setInputValue('')
    setQueuedPrompt(null)
    setCurrentConversationId(null)
    setTaskErrors({})
    setCompletingTaskIds({})
    setQuizDrafts({})
    setQuizSubmittingState({})
    setQuizErrors({})
    setSessionKey(`session-${user.id}-${Date.now()}`)
  }

  function handleSelectConversation(conversation) {
    setIsStreaming(false)
    setInputValue('')
    setMessages([])
    setTaskErrors({})
    setCompletingTaskIds({})
    setQuizDrafts({})
    setQuizSubmittingState({})
    setQuizErrors({})
    setCurrentConversationId(conversation.id)
    setSessionKey(conversation.session_key)
  }

  function handlePromptClick(prompt) {
    if (isStreaming || isFetchingConversationMessages) {
      return
    }

    setInputValue(prompt)
    setQueuedPrompt(prompt)
  }

  function updateMessagesForTask(taskId, nextStatus) {
    const applyStatusUpdate = (existingMessages = []) =>
      existingMessages.map((message) => {
        if (message.uiPayload?.type !== 'checklist') {
          return message
        }

        const hasTask = message.uiPayload.items.some((item) => item.taskId === taskId)

        if (!hasTask) {
          return message
        }

        return {
          ...message,
          uiPayload: {
            ...message.uiPayload,
            items: message.uiPayload.items.map((item) =>
              item.taskId === taskId
                ? {
                    ...item,
                    status: nextStatus,
                  }
                : item,
            ),
          },
        }
      })

    setMessages((previousMessages) => applyStatusUpdate(previousMessages))
    queryClient.setQueriesData({ queryKey: ['conversation-messages'] }, applyStatusUpdate)
  }

  async function handleCompleteTask(taskId) {
    if (completingTaskIds[taskId]) {
      return
    }

    setCompletingTaskIds((current) => ({
      ...current,
      [taskId]: true,
    }))
    setTaskErrors((current) => {
      const nextErrors = { ...current }
      delete nextErrors[taskId]
      return nextErrors
    })

    try {
      await onboardingService.completeChecklistTask(taskId)
      updateMessagesForTask(taskId, 'completed')
    } catch (error) {
      setTaskErrors((current) => ({
        ...current,
        [taskId]: getTaskCompletionError(error),
      }))
    } finally {
      setCompletingTaskIds((current) => {
        const nextPending = { ...current }
        delete nextPending[taskId]
        return nextPending
      })
    }
  }

  function handleQuizAnswerChange(messageId, questionId, nextValue) {
    setQuizDrafts((current) => {
      const existingDraft = current[messageId] || {}

      return {
        ...current,
        [messageId]: {
          ...existingDraft,
          [questionId]: nextValue,
        },
      }
    })
  }

  function updateQuizResult(messageId, result) {
    const applyQuizResult = (existingMessages = []) =>
      existingMessages.map((message) => {
        if (message.id !== messageId || message.uiPayload?.type !== 'quiz') {
          return message
        }

        return normalizeChatMessage({
          ...message,
          uiPayload: {
            ...message.uiPayload,
            result,
          },
        })
      })

    setMessages((previousMessages) => applyQuizResult(previousMessages))
    queryClient.setQueriesData({ queryKey: ['conversation-messages'] }, applyQuizResult)
  }

  async function handleSubmitQuiz(message, payload) {
    const messageId = message.id || payload.quizId

    if (!messageId || !payload.quizId || quizSubmittingState[messageId]) {
      return
    }

    const answers = quizDrafts[messageId] || buildQuizInitialAnswers(payload)
    const missingRequiredQuestion = payload.items.find(
      (question) => question.required && !hasAnswerValue(question, answers[question.questionId]),
    )

    if (missingRequiredQuestion) {
      setQuizErrors((current) => ({
        ...current,
        [messageId]: 'Vui long tra loi tat ca cau hoi truoc khi nop bai.',
      }))
      return
    }

    setQuizSubmittingState((current) => ({
      ...current,
      [messageId]: true,
    }))
    setQuizErrors((current) => {
      const nextErrors = { ...current }
      delete nextErrors[messageId]
      return nextErrors
    })

    try {
      const submittedAnswers = buildQuizSubmissionAnswers(payload, answers)
      const submitResult = await trainingService.submitQuiz({
        quizId: payload.quizId,
        assistantMessageId: messageId,
        answers: submittedAnswers,
        durationSeconds: null,
      })

      const attemptId = submitResult?.attemptId
      const fetchedResult = attemptId ? await trainingService.getQuizResult(attemptId) : null
      const nextResult = {
        ...submitResult,
        ...fetchedResult,
      }

      updateQuizResult(messageId, nextResult)
    } catch (error) {
      setQuizErrors((current) => ({
        ...current,
        [messageId]: getQuizSubmissionError(error),
      }))
    } finally {
      setQuizSubmittingState((current) => {
        const nextPending = { ...current }
        delete nextPending[messageId]
        return nextPending
      })
    }
  }

  async function sendMessage(text) {
    if (!text.trim() || isStreaming) {
      return
    }

    const userMessage = {
      id: `user-${Date.now()}`,
      sender_type: 'user',
      content: text,
    }
    const assistantPlaceholderId = `assistant-${Date.now()}`

    setMessages((prev) => [
      ...prev,
      userMessage,
      normalizeChatMessage({
        id: assistantPlaceholderId,
        sender_type: 'assistant',
        content: '',
        rawContent: '',
        uiPayload: null,
      }),
    ])
    setIsStreaming(true)

    try {
      await chatService.sendMessageStream(text, sessionKey, (event) => {
        setMessages((prev) =>
          prev.map((message) => {
            if (message.id !== assistantPlaceholderId) {
              return message
            }

            if (event.type === 'ui-payload') {
              return normalizeChatMessage({
                ...message,
                uiPayload: event.uiPayload,
              })
            }

            if (event.type === 'text') {
              const nextRawContent = `${message.rawContent || message.content || ''}${event.chunk}`

              return normalizeChatMessage({
                ...message,
                rawContent: nextRawContent,
              })
            }

            return message
          }),
        )
      })

      const refreshedConversations = await queryClient.fetchQuery({
        queryKey: ['conversations'],
        queryFn: chatService.getConversations,
      })

      const matchingConversation = refreshedConversations.find(
        (conversation) => conversation.session_key === sessionKey,
      )

      if (matchingConversation) {
        setCurrentConversationId(matchingConversation.id)
      }
    } catch (error) {
      console.error('Chat error:', error)
      setMessages((prev) =>
        prev.map((message) =>
          message.id === assistantPlaceholderId
            ? {
                ...message,
                sender_type: 'system',
                content: 'Co loi xay ra khi gui tin nhan. Vui long thu lai.',
                rawContent: 'Co loi xay ra khi gui tin nhan. Vui long thu lai.',
                uiPayload: null,
              }
            : message,
        ),
      )
    } finally {
      setIsStreaming(false)
    }
  }

  async function handleFormSubmit(event) {
    event.preventDefault()
    const text = inputValue
    setInputValue('')
    await sendMessage(text)
  }

  const isBusy = isStreaming || isFetchingConversationMessages

  return (
    <main className="dashboard-layout">
      <aside className="dashboard-sidebar">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', height: '100%' }}>
          <button
            className="submit-button"
            style={{ minHeight: '3rem', width: '100%' }}
            onClick={handleNewChat}
          >
            + New Chat
          </button>

          <div style={{ flex: 1, overflowY: 'auto', marginTop: '1rem' }}>
            <p className="section-tag" style={{ marginBottom: '0.5rem' }}>History</p>
            {isLoadingConversations ? (
              <p style={{ color: 'var(--text-soft)', fontSize: '0.8rem' }}>Loading history...</p>
            ) : (
              <div style={{ display: 'grid', gap: '0.5rem' }}>
                {conversations.map((conversation) => {
                  const cachedMessages =
                    queryClient.getQueryData(['conversation-messages', conversation.id]) || []
                  const label = formatConversationLabel(conversation, cachedMessages)
                  const isActive = currentConversationId === conversation.id

                  return (
                    <button
                      key={conversation.id}
                      onClick={() => handleSelectConversation(conversation)}
                      className={isActive ? 'conversation-card is-active' : 'conversation-card'}
                      type="button"
                    >
                      <div className="conversation-card__title">{label}</div>
                      <div className="conversation-card__meta">
                        {new Date(conversation.started_at).toLocaleDateString()}
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          <div
            className="identity-stack"
            style={{
              marginTop: 'auto',
              paddingTop: '1rem',
              borderTop: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            <div>
              <p className="section-tag" style={{ fontSize: '0.6rem' }}>Signed In As</p>
              <h3 style={{ fontSize: '1rem', margin: '0.2rem 0' }}>{user?.fullName}</h3>
              <p className="sidebar-copy" style={{ fontSize: '0.75rem' }}>
                {user?.role} • {user?.department}
              </p>
            </div>

            <div style={{ display: 'grid', gap: '0.5rem', marginTop: '1rem' }}>
              {isAdmin && (
                <button
                  className="ghost-button"
                  type="button"
                  onClick={() => navigate('/admin/roles')}
                  style={{ minHeight: '2.5rem', fontSize: '0.85rem' }}
                >
                  Manage Roles
                </button>
              )}
              <button
                className="ghost-button"
                type="button"
                onClick={handleLogout}
                style={{ minHeight: '2.5rem', fontSize: '0.85rem' }}
              >
                Dang xuat
              </button>
            </div>
          </div>
        </div>
      </aside>

      <section className="dashboard-main" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <header className="dashboard-hero" style={{ padding: '1.5rem', marginBottom: '1rem' }}>
          <p className="section-tag">AI Assistant</p>
          <h1>Xin chao, {user?.fullName}.</h1>
          <p className="panel-copy">
            Toi co the giup gi cho ban ve Onboarding, Dao tao hoac Bao cao hom nay?
          </p>
        </header>

        <section
          className="dashboard-card chat-thread"
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            padding: '1.5rem',
            gap: '1rem',
            overflowY: 'auto',
            maxHeight: 'calc(100vh - 350px)',
          }}
        >
          {isFetchingConversationMessages ? (
            <div style={{ textAlign: 'center', marginTop: '2rem', color: 'var(--text-soft)' }}>
              Dang tai lich su hoi thoai...
            </div>
          ) : messages.length === 0 ? (
            <div style={{ textAlign: 'center', marginTop: '2rem' }}>
              <p style={{ color: 'var(--text-soft)', marginBottom: '1.5rem' }}>
                Chua co tin nhan nao. Thu bat dau voi mot cau hoi goi y duoi day:
              </p>
              <div className="suggestion-chip-row">
                {SUGGESTED_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => handlePromptClick(prompt)}
                    disabled={isBusy}
                    className="suggestion-chip rounded-full border border-white/10 bg-white/8 px-5 py-3 text-sm font-semibold text-[var(--text-strong)] transition hover:-translate-y-0.5 hover:bg-white/14 disabled:cursor-wait disabled:opacity-70"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((message, index) => (
              <ChatMessageBubble
                key={message.id || index}
                message={message}
                index={index}
                isBusy={isBusy}
                messagesLength={messages.length}
                completingTaskIds={completingTaskIds}
                taskErrors={taskErrors}
                onCompleteTask={handleCompleteTask}
                quizDrafts={quizDrafts}
                quizSubmittingState={quizSubmittingState}
                quizErrors={quizErrors}
                onQuizAnswerChange={handleQuizAnswerChange}
                onSubmitQuiz={handleSubmitQuiz}
              />
            ))
          )}
          <div ref={messagesEndRef} />
        </section>

        <form
          onSubmit={handleFormSubmit}
          style={{
            marginTop: '1rem',
            display: 'flex',
            gap: '1rem',
            alignItems: 'center',
          }}
        >
          <input
            className="field-control"
            type="text"
            placeholder="Nhap tin nhan cua ban..."
            value={inputValue}
            onChange={(event) => setInputValue(event.target.value)}
            disabled={isBusy}
            style={{ flex: 1 }}
          />
          <button
            className="submit-button"
            type="submit"
            disabled={isBusy || !inputValue.trim()}
            style={{ padding: '0 2rem', minWidth: 'auto' }}
          >
            {isBusy ? '...' : 'Gui'}
          </button>
        </form>
      </section>
    </main>
  )
}
