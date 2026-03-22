import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

export function AdminRoute({ children }) {
  const session = useAuthStore((state) => state.session)
  const isAdmin = session?.user?.roleCode === 'admin' || session?.user?.roleCode === 'security_admin'

  if (!session) {
    return <Navigate to="/" replace />
  }

  if (!isAdmin) {
    return <Navigate to="/chat" replace />
  }

  return children
}
