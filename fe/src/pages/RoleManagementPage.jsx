import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { userService } from '../services/userService'
import { useAuthStore } from '../store/authStore'

export function RoleManagementPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const clearSession = useAuthStore((state) => state.clearSession)
  const session = useAuthStore((state) => state.session)
  const user = session?.user
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState('name')

  const { data: usersResponse, isLoading, error } = useQuery({
    queryKey: ['users'],
    queryFn: userService.getUsers,
  })

  const mutation = useMutation({
    mutationFn: ({ userId, agentGroupCode, isAllowed }) =>
      userService.updateAgentAccess(userId, agentGroupCode, isAllowed),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
  })
  const isSaving = mutation.isPending

  function handleLogout() {
    clearSession()
    navigate('/', { replace: true })
  }

  function toggleAccess(userId, agentGroupCode, currentIsAllowed) {
    mutation.mutate({
      userId,
      agentGroupCode,
      isAllowed: !currentIsAllowed,
    })
  }

  const agentGroups = [
    { code: 'onboarding', label: 'Onboarding' },
    { code: 'learning_training', label: 'Learning' },
    { code: 'training_analytics', label: 'Analytics' },
  ]

  if (isLoading) return <div className="p-8">Loading users...</div>
  if (error) return <div className="p-8 text-red-500">Error loading users: {error.message}</div>

  const users = usersResponse?.data || []
  const normalizedSearch = searchTerm.trim().toLowerCase()
  const sortedUsers = [...users]
    .filter((directoryUser) => {
      if (!normalizedSearch) {
        return true
      }

      return [
        directoryUser.full_name,
        directoryUser.email,
        directoryUser.status,
        directoryUser.user_roles?.[0]?.roles?.name,
      ]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(normalizedSearch))
    })
    .sort((left, right) => {
      if (sortBy === 'role') {
        return (left.user_roles?.[0]?.roles?.name || '').localeCompare(
          right.user_roles?.[0]?.roles?.name || '',
        )
      }

      if (sortBy === 'status') {
        return (left.status || '').localeCompare(right.status || '')
      }

      return (left.full_name || '').localeCompare(right.full_name || '')
    })

  return (
    <main className="dashboard-layout">
      <aside className="dashboard-sidebar">
        <div>
          <p className="section-tag">Admin Console</p>
          <h2>{user?.fullName}</h2>
          <p className="sidebar-copy">{user?.email}</p>
        </div>

        <div className="identity-stack">
          <div className="identity-card">
            <span className="signal-label">Role</span>
            <strong>{user?.role}</strong>
            <p>Admin privileges active</p>
          </div>
        </div>

        <div style={{ marginTop: 'auto', display: 'grid', gap: '0.5rem' }}>
          <button className="ghost-button" type="button" onClick={() => navigate('/chat')}>
            Back to Chat
          </button>
          <button className="ghost-button" type="button" onClick={handleLogout}>
            Dang xuat
          </button>
        </div>
      </aside>

      <section className="dashboard-main">
        <header className="dashboard-hero">
          <p className="section-tag">Role Management</p>
          <h1>User Directory & Access Control</h1>
          <p className="panel-copy">
            Manage agent access for all employees. Changes are applied instantly to the security boundary.
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '1rem' }}>
            <input
              className="field-control"
              style={{ maxWidth: '320px' }}
              type="text"
              placeholder="Filter by name, email, role, status..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
            <select
              className="field-control"
              style={{ maxWidth: '220px' }}
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value)}
            >
              <option value="name">Sort by name</option>
              <option value="role">Sort by role</option>
              <option value="status">Sort by status</option>
            </select>
          </div>
        </header>

        <section className="dashboard-card" style={{ padding: '0', overflowX: 'auto' }}>
          <table className="user-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--surface-border)' }}>
                <th style={{ padding: '1rem' }}>User</th>
                <th style={{ padding: '1rem' }}>Role</th>
                <th style={{ padding: '1rem' }}>Status</th>
                {agentGroups.map((group) => (
                  <th key={group.code} style={{ padding: '1rem', textAlign: 'center' }}>
                    {group.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedUsers.map((u) => (
                <tr key={u.id} style={{ borderBottom: '1px solid var(--surface-border)' }}>
                  <td style={{ padding: '1rem' }}>
                    <div style={{ fontWeight: 600 }}>{u.full_name}</div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-soft)' }}>{u.email}</div>
                  </td>
                  <td style={{ padding: '1rem' }}>
                    {u.user_roles?.[0]?.roles?.name || 'No Role'}
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minWidth: '88px',
                        padding: '0.35rem 0.8rem',
                        borderRadius: '999px',
                        backgroundColor:
                          u.status === 'active'
                            ? 'rgba(54, 179, 126, 0.18)'
                            : 'rgba(255,255,255,0.08)',
                        color:
                          u.status === 'active'
                            ? '#1f7a52'
                            : 'var(--text-soft)',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                      }}
                    >
                      {(u.status || 'unknown').toUpperCase()}
                    </span>
                  </td>
                  {agentGroups.map((group) => {
                    const access = u.user_agent_access?.find(
                      (a) => a.agent_groups?.code === group.code
                    )
                    const isAllowed = access ? access.is_allowed : false

                    return (
                      <td key={group.code} style={{ padding: '1rem', textAlign: 'center' }}>
                        <button
                          onClick={() => toggleAccess(u.id, group.code, isAllowed)}
                          disabled={isSaving}
                          style={{
                            padding: '0.4rem 0.8rem',
                            borderRadius: '999px',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            backgroundColor: isAllowed ? 'var(--accent)' : 'rgba(255,255,255,0.1)',
                            color: isAllowed ? '#fff' : 'var(--text-soft)',
                            transition: 'all 160ms ease',
                          }}
                        >
                          {isSaving ? 'SAVING...' : isAllowed ? 'ALLOWED' : 'DENIED'}
                        </button>
                      </td>
                    )
                  })}
                </tr>
              ))}
              {sortedUsers.length === 0 && (
                <tr>
                  <td
                    colSpan={3 + agentGroups.length}
                    style={{ padding: '1.5rem', color: 'var(--text-soft)', textAlign: 'center' }}
                  >
                    No users match the current filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>
      </section>
    </main>
  )
}
