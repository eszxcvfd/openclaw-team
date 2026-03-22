import { apiClient } from './apiClient'

export const onboardingService = {
  completeChecklistTask: async (taskId) => {
    const response = await apiClient.post(`/api/me/checklist/${taskId}/complete`)
    return response.data
  },
}
