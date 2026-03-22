import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { AuditLogsPage } from './AuditLogsPage'
import { auditService } from '../services/auditService'
import { useAuthStore } from '../store/authStore'

vi.mock('../services/auditService', () => ({
  auditService: {
    getAuditLogs: vi.fn(),
    getAuditLogDetail: vi.fn(),
  },
}))

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })

  return function Wrapper({ children }) {
    return (
      <MemoryRouter>
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      </MemoryRouter>
    )
  }
}

function renderPage() {
  return render(<AuditLogsPage />, { wrapper: createWrapper() })
}

describe('AuditLogsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    useAuthStore.setState({
      session: {
        user: {
          fullName: 'Security Admin',
          email: 'security@example.com',
          role: 'Security Admin',
          roleCode: 'security_admin',
        },
        tokens: {
          userAccessToken: 'token-123',
        },
      },
    })
  })

  it('shows loading state while fetching audit rows', () => {
    auditService.getAuditLogs.mockImplementation(() => new Promise(() => {}))

    renderPage()

    expect(screen.getByText('Loading audit events...')).toBeInTheDocument()
  })

  it('shows error state when the list query fails', async () => {
    auditService.getAuditLogs.mockRejectedValue(new Error('List failed'))

    renderPage()

    expect(await screen.findByText('Could not load audit events')).toBeInTheDocument()
    expect(screen.getByText('List failed')).toBeInTheDocument()
  })

  it('submits story-aligned filters to the list API and renders rows with fallback-safe labels', async () => {
    auditService.getAuditLogs.mockResolvedValue({
      success: true,
      data: {
        items: [
          {
            id: 'log-1',
            traceId: 'trace-1',
            conversationId: null,
            resultStatus: 'denied',
            eventTime: '2026-03-22T14:00:00.000Z',
            httpStatus: 403,
            user: {
              label: 'Unverified request',
            },
            tool: {
              label: 'Unknown tool',
            },
            agentGroup: {
              code: 'onboarding',
            },
          },
        ],
        pagination: {
          page: 1,
          pageSize: 10,
          totalItems: 1,
          totalPages: 1,
        },
      },
      meta: {
        traceId: 'trace-external-1',
      },
    })

    renderPage()

    await waitFor(() => {
      expect(auditService.getAuditLogs).toHaveBeenCalledWith({
        user: '',
        tool: '',
        dateFrom: '',
        dateTo: '',
        success: '',
        trace: '',
        page: 1,
        pageSize: 10,
      })
    })

    const user = userEvent.setup()
    await user.type(screen.getByLabelText('User'), 'alice@example.com')
    await user.type(screen.getByLabelText('Tool name'), 'generate_quiz')
    await user.type(screen.getByLabelText('From date'), '2026-03-21')
    await user.type(screen.getByLabelText('To date'), '2026-03-22')
    await user.selectOptions(screen.getByLabelText('Result'), 'false')
    await user.type(screen.getByLabelText('Trace lookup'), 'trace-1')
    await user.click(screen.getByRole('button', { name: 'Apply filters' }))

    await waitFor(() => {
      expect(auditService.getAuditLogs).toHaveBeenLastCalledWith({
        user: 'alice@example.com',
        tool: 'generate_quiz',
        dateFrom: '2026-03-21',
        dateTo: '2026-03-22',
        success: 'false',
        trace: 'trace-1',
        page: 1,
        pageSize: 10,
      })
    })

    expect(screen.getByText('Unverified request')).toBeInTheDocument()
    expect(screen.getByText('Unknown tool')).toBeInTheDocument()
    expect(screen.getByText('No conversation linked')).toBeInTheDocument()
  })

  it('opens detail inspection and shows exact stored scope for a selected event', async () => {
    auditService.getAuditLogs.mockResolvedValue({
      success: true,
      data: {
        items: [
          {
            id: 'log-2',
            traceId: 'trace-2',
            conversationId: 'conv-2',
            resultStatus: 'success',
            eventTime: '2026-03-22T15:00:00.000Z',
            httpStatus: 200,
            user: {
              label: 'Alice Example',
            },
            tool: {
              label: 'Generate Quiz',
            },
            agentGroup: {
              code: 'learning_training',
            },
          },
        ],
        pagination: {
          page: 1,
          pageSize: 10,
          totalItems: 1,
          totalPages: 1,
        },
      },
    })
    auditService.getAuditLogDetail.mockResolvedValue({
      success: true,
      data: {
        id: 'log-2',
        traceId: 'trace-2',
        conversationId: 'conv-2',
        tokenScope: ['write:training', 'read:training'],
        resultStatus: 'success',
        httpStatus: 200,
        user: {
          label: 'Alice Example',
        },
        tool: {
          label: 'Generate Quiz',
        },
        agentGroup: {
          name: 'Learning Training',
        },
        eventTime: '2026-03-22T15:00:00.000Z',
        finishedAt: '2026-03-22T15:00:02.000Z',
        errorMessage: null,
      },
    })

    renderPage()

    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'conv-2' }))

    await waitFor(() => {
      expect(auditService.getAuditLogDetail).toHaveBeenCalledWith('log-2')
    })

    expect(await screen.findByText('Exact scope used')).toBeInTheDocument()
    expect(screen.getByText('write:training')).toBeInTheDocument()
    expect(screen.getByText('read:training')).toBeInTheDocument()
    expect(
      screen.getByText(/Sensitive request headers and bearer tokens are intentionally not rendered here/i),
    ).toBeInTheDocument()
  })
})
