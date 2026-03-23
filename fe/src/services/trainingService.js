import { apiClient } from './apiClient'

function unwrapResponseData(response) {
  return response?.data?.data ?? response?.data ?? null
}

export const trainingService = {
  submitQuiz: async ({ quizId, assistantMessageId, answers, durationSeconds }) => {
    const response = await apiClient.post('/api/quiz/submit', {
      quizId,
      assistantMessageId,
      answers,
      durationSeconds,
    })

    return unwrapResponseData(response)
  },

  getQuizResult: async (attemptId) => {
    const response = await apiClient.get(`/api/quiz/${attemptId}/result`)
    return unwrapResponseData(response)
  },
}
