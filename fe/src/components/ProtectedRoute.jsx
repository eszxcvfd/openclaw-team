import { Navigate } from 'react-router-dom'

import { useAuthStore } from '../store/authStore'

export function ProtectedRoute({ children }) {
  const session = useAuthStore((state) => state.session)

  if (!session) {
    return <Navigate to="/" replace />
  }

  return children
}
