import { useEffect, useEffectEvent, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '../store/authStore'
import { chatService, normalizeChatMessage } from '../services/chatService'
import { onboardingService } from '../services/onboardingService'

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

function StructuredAssistantContent({ message, completingTaskIds, taskErrors, onCompleteTask, isPending }) {
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
    setSessionKey(`session-${user.id}-${Date.now()}`)
  }

  function handleSelectConversation(conversation) {
    setIsStreaming(false)
    setInputValue('')
    setMessages([])
    setTaskErrors({})
    setCompletingTaskIds({})
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
