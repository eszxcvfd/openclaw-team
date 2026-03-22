import axios from 'axios'
import { useAuthStore } from '../store/authStore'

export const apiClient = axios.create({
  headers: {
    'Content-Type': 'application/json',
  },
})

apiClient.interceptors.request.use((config) => {
  const session = useAuthStore.getState().session
  const token = session?.tokens?.userAccessToken

  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})
