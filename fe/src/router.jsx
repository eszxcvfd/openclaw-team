import { createBrowserRouter } from 'react-router-dom'

import App from './App.jsx'
import { AdminRoute } from './components/AdminRoute.jsx'
import { ProtectedRoute } from './components/ProtectedRoute.jsx'
import { AuditLogsPage } from './pages/AuditLogsPage.jsx'
import { ChatDashboardPage } from './pages/ChatDashboardPage.jsx'
import { LoginPage } from './pages/LoginPage.jsx'
import { RoleManagementPage } from './pages/RoleManagementPage.jsx'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      {
        index: true,
        element: <LoginPage />,
      },
      {
        path: 'chat',
        element: (
          <ProtectedRoute>
            <ChatDashboardPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'admin/audit-logs',
        element: (
          <AdminRoute>
            <AuditLogsPage />
          </AdminRoute>
        ),
      },
      {
        path: 'admin/roles',
        element: (
          <AdminRoute>
            <RoleManagementPage />
          </AdminRoute>
        ),
      },
    ],
  },
])
