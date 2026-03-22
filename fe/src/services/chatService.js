import { useAuthStore } from '../store/authStore'
import { apiClient } from './apiClient'

export const chatService = {
  getConversations: async () => {
    const response = await apiClient.get('/api/chat/conversations')
    return response.data
  },

  getMessages: async (conversationId) => {
    const response = await apiClient.get(`/api/chat/conversations/${conversationId}/messages`)
    return response.data
  },

  sendMessageStream: async (message, sessionKey, onChunk) => {
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
        const dataLine = segment
          .split('\n')
          .find((line) => line.startsWith('data: '))

        if (!dataLine) {
          continue
        }

        try {
          const jsonStr = dataLine.slice(6)

          if (jsonStr === '[DONE]') {
            continue
          }

          const eventData = JSON.parse(jsonStr)

          if (eventData.data?.chunk) {
            onChunk(eventData.data.chunk)
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
