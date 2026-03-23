import { apiClient } from './apiClient'

function unwrapResponseData(response) {
  return response?.data?.data ?? response?.data ?? null
}

export const trainingService = {
  getTrainingRecommendations: async () => {
    const response = await apiClient.get('/api/me/training-recommendations')
    return unwrapResponseData(response)
  },

  getLearningPath: async () => {
    const response = await apiClient.get('/api/me/learning-path')
    return unwrapResponseData(response)
  },

  generateLearningPath: async (payload = {}) => {
    const response = await apiClient.post('/api/me/learning-path/generate', payload)
    return unwrapResponseData(response)
  },

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
