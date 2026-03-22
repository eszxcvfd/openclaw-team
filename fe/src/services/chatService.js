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
