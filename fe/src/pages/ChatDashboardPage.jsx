import { useEffect, useEffectEvent, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '../store/authStore'
import { chatService } from '../services/chatService'

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
    setSessionKey(`session-${user.id}-${Date.now()}`)
  }

  function handleSelectConversation(conversation) {
    setIsStreaming(false)
    setInputValue('')
    setMessages([])
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
      { id: assistantPlaceholderId, sender_type: 'assistant', content: '' },
    ])
    setIsStreaming(true)

    try {
      await chatService.sendMessageStream(text, sessionKey, (chunk) => {
        setMessages((prev) =>
          prev.map((message) =>
            message.id === assistantPlaceholderId
              ? {
                  ...message,
                  content: `${message.content || ''}${chunk}`,
                }
              : message,
          ),
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
          className="dashboard-card"
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
              <div
                key={message.id || index}
                style={{
                  alignSelf: message.sender_type === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '80%',
                  padding: '1rem',
                  borderRadius: '18px',
                  backgroundColor:
                    message.sender_type === 'user' ? 'var(--accent)' : 'rgba(255,255,255,0.06)',
                  color: message.sender_type === 'user' ? '#fff' : 'var(--text-strong)',
                  border:
                    message.sender_type === 'user'
                      ? 'none'
                      : '1px solid rgba(255,255,255,0.1)',
                  whiteSpace: 'pre-wrap',
                }}
              >
                {message.content || (isBusy && index === messages.length - 1 ? '...' : '')}
              </div>
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
