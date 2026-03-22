import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'

import { AdminRoute } from './AdminRoute'
import { useAuthStore } from '../store/authStore'

function renderAdminRoute() {
  return render(
    <MemoryRouter initialEntries={['/admin/audit-logs']}>
      <Routes>
        <Route path="/" element={<div>Login page</div>} />
        <Route path="/chat" element={<div>Chat page</div>} />
        <Route
          path="/admin/audit-logs"
          element={
            <AdminRoute>
              <div>Audit dashboard</div>
            </AdminRoute>
          }
        />
      </Routes>
    </MemoryRouter>,
  )
}

describe('AdminRoute', () => {
  beforeEach(() => {
    useAuthStore.setState({
      session: null,
    })
  })

  it('redirects unauthenticated users to login', () => {
    renderAdminRoute()

    expect(screen.getByText('Login page')).toBeInTheDocument()
  })

  it('redirects non-admin users to chat', () => {
    useAuthStore.setState({
      session: {
        user: {
          roleCode: 'employee',
        },
      },
    })

    renderAdminRoute()

    expect(screen.getByText('Chat page')).toBeInTheDocument()
  })

  it('renders protected content for security admins', () => {
    useAuthStore.setState({
      session: {
        user: {
          roleCode: 'security_admin',
        },
      },
    })

    renderAdminRoute()

    expect(screen.getByText('Audit dashboard')).toBeInTheDocument()
  })
})
