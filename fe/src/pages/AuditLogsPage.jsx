import { useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { auditService } from '../services/auditService'
import { useAuthStore } from '../store/authStore'

const DEFAULT_FILTERS = {
  user: '',
  tool: '',
  dateFrom: '',
  dateTo: '',
  success: '',
  trace: '',
}

const DEFAULT_PAGE_SIZE = 10

function deepGet(target, path) {
  return path.split('.').reduce((value, segment) => value?.[segment], target)
}

function getFirstValue(target, paths) {
  for (const path of paths) {
    const value = deepGet(target, path)

    if (value !== undefined && value !== null && value !== '') {
      return value
    }
  }

  return null
}

function getStringValue(target, paths) {
  const value = getFirstValue(target, paths)

  if (typeof value === 'string') {
    return value.trim() || null
  }

  if (typeof value === 'number') {
    return String(value)
  }

  return null
}

function getArrayValue(target, paths) {
  for (const path of paths) {
    const value = deepGet(target, path)

    if (Array.isArray(value)) {
      return value
    }

    if (typeof value === 'string' && value.trim()) {
      return value
        .split(/[\s,]+/)
        .map((item) => item.trim())
        .filter(Boolean)
    }
  }

  return []
}

function normalizeAuditLogList(response) {
  const wrapper = response ?? {}
  const payload = wrapper.data && typeof wrapper.data === 'object' ? wrapper.data : wrapper

  if (Array.isArray(payload)) {
    return {
      rows: payload,
      pagination: wrapper.meta ?? {},
      meta: wrapper.meta ?? {},
    }
  }

  if (payload && typeof payload === 'object') {
    const rows = payload.items ?? payload.records ?? payload.rows ?? payload.data ?? []
    const pagination = payload.pagination ?? payload.meta?.pagination ?? {}

    return {
      rows: Array.isArray(rows) ? rows : [],
      pagination: pagination && typeof pagination === 'object' ? pagination : {},
      meta: payload.meta ?? wrapper.meta ?? {},
    }
  }

  return {
    rows: [],
    pagination: {},
    meta: wrapper.meta ?? {},
  }
}

function normalizeAuditLogDetail(response) {
  if (!response || typeof response !== 'object') {
    return null
  }

  if (response.data && typeof response.data === 'object' && !Array.isArray(response.data)) {
    return response.data
  }

  return response
}

function formatDateTime(value) {
  if (!value) {
    return 'Unavailable'
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return 'Unavailable'
  }

  return date.toLocaleString()
}

function formatShortDate(value) {
  if (!value) {
    return 'Any time'
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return 'Any time'
  }

  return date.toLocaleDateString()
}

function getAuditLogId(entry) {
  return getStringValue(entry, ['id', 'logId', 'auditLogId'])
}

function getUserLabel(entry) {
  const explicitLabel = getStringValue(entry, [
    'userLabel',
    'user.label',
    'userName',
    'user_name',
    'user.fullName',
    'user.full_name',
    'actor.fullName',
    'actor.full_name',
    'requestPayload.userName',
    'requestPayload.user_name',
    'request_payload.userName',
    'request_payload.user_name',
    'requestPayload.userEmail',
    'requestPayload.user_email',
    'request_payload.userEmail',
    'request_payload.user_email',
  ])

  if (explicitLabel) {
    return explicitLabel
  }

  const userId = getStringValue(entry, ['userId', 'user_id'])

  if (userId) {
    return `User ${userId.slice(0, 8)}`
  }

  return 'Unverified request'
}

function getToolLabel(entry) {
  const explicitLabel = getStringValue(entry, [
    'toolLabel',
    'tool.label',
    'toolName',
    'tool_name',
    'tool.name',
    'tool.code',
    'toolCode',
    'apiName',
    'requestPayload.toolName',
    'requestPayload.tool_name',
    'request_payload.toolName',
    'request_payload.tool_name',
  ])

  if (explicitLabel) {
    return explicitLabel
  }

  const toolId = getStringValue(entry, ['toolId', 'tool_id'])

  if (toolId) {
    return `Tool ${toolId.slice(0, 8)}`
  }

  return 'Unknown tool'
}

function getConversationId(entry) {
  return getStringValue(entry, [
    'conversationId',
    'conversation_id',
    'conversation.id',
    'requestPayload.conversationId',
    'request_payload.conversationId',
  ])
}

function getTraceId(entry) {
  return getStringValue(entry, ['traceId', 'trace_id']) ?? 'Unavailable'
}

function getEventTime(entry) {
  return getStringValue(entry, ['eventTime', 'startedAt', 'started_at', 'createdAt', 'created_at'])
}

function getFinishedTime(entry) {
  return getStringValue(entry, ['finishedAt', 'finished_at'])
}

function getAgentGroup(entry) {
  return (
    getStringValue(entry, [
      'agentGroup.name',
      'agentGroup.code',
      'agentGroup',
      'agent_group',
      'agentGroupCode',
      'agent_group_code',
    ]) ??
    'Unknown agent'
  )
}

function getHttpStatus(entry) {
  const value = getFirstValue(entry, ['httpStatus', 'http_status'])

  if (typeof value === 'number') {
    return value
  }

  if (typeof value === 'string' && value.trim()) {
    return value.trim()
  }

  return '—'
}

function getErrorMessage(entry) {
  return getStringValue(entry, ['errorMessage', 'error_message']) ?? 'None recorded'
}

function getScopeList(entry) {
  const scopes = getArrayValue(entry, [
    'exactScope',
    'scope',
    'tokenScope',
    'requestScope',
    'requestPayload.scope',
    'requestPayload.scopes',
    'request_payload.scope',
    'request_payload.scopes',
    'metadata.scope',
    'metadata.scopes',
  ])

  return scopes
    .map((item) => {
      if (typeof item === 'string') {
        return item.trim()
      }

      if (typeof item === 'number') {
        return String(item)
      }

      return null
    })
    .filter(Boolean)
}

function getResultState(entry) {
  const rawStatus = getStringValue(entry, ['resultStatus', 'result_status', 'status'])?.toLowerCase()
  const httpStatus = Number(getFirstValue(entry, ['httpStatus', 'http_status']))
  const success = getFirstValue(entry, ['success'])
  const errorMessage = getErrorMessage(entry).toLowerCase()

  if (rawStatus?.includes('denied') || rawStatus?.includes('forbidden')) {
    return { label: 'DENIED', tone: 'denied' }
  }

  if (rawStatus?.includes('fail') || rawStatus?.includes('error')) {
    return { label: 'FAILED', tone: 'failed' }
  }

  if (success === true || success === 'true') {
    return { label: 'SUCCESS', tone: 'success' }
  }

  if (
    success === false ||
    success === 'false' ||
    httpStatus === 401 ||
    httpStatus === 403 ||
    errorMessage.includes('forbidden') ||
    errorMessage.includes('denied') ||
    errorMessage.includes('unauthorized')
  ) {
    if (httpStatus === 401 || httpStatus === 403 || errorMessage.includes('forbidden') || errorMessage.includes('denied')) {
      return { label: 'DENIED', tone: 'denied' }
    }

    return { label: 'FAILED', tone: 'failed' }
  }

  return { label: 'UNKNOWN', tone: 'neutral' }
}

function getQueryErrorMessage(error, fallbackMessage) {
  return error?.response?.data?.error?.message ?? error?.message ?? fallbackMessage
}

function AuditLogDetailPanel({ logId, selectedEntry }) {
  const {
    data: detailResponse,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['audit-log-detail', logId],
    queryFn: () => auditService.getAuditLogDetail(logId),
    enabled: Boolean(logId),
  })

  if (!logId && !selectedEntry) {
    return (
      <section className="dashboard-card audit-detail-card audit-detail-card--placeholder">
        <p className="section-tag">Investigation detail</p>
        <strong>Select an event to inspect its exact scope</strong>
        <p>
          Click a conversation ID or the inspect action in the table to review the stored token scope and
          event context for that audit record.
        </p>
      </section>
    )
  }

  if (logId && (isLoading || isFetching)) {
    return (
      <section className="dashboard-card audit-detail-card">
        <p className="section-tag">Investigation detail</p>
        <strong>Loading selected event...</strong>
        <p>Fetching the stored scope and event metadata.</p>
      </section>
    )
  }

  if (logId && isError) {
    return (
      <section className="dashboard-card audit-detail-card">
        <p className="section-tag">Investigation detail</p>
        <strong>Could not load the selected event</strong>
        <p>{getQueryErrorMessage(error, 'The audit log detail is unavailable right now.')}</p>
        <button className="ghost-button audit-inline-button" type="button" onClick={() => refetch()}>
          Retry detail
        </button>
      </section>
    )
  }

  const detail = normalizeAuditLogDetail(detailResponse) ?? selectedEntry
  const status = getResultState(detail)
  const scopeList = getScopeList(detail)
  const conversationId = getConversationId(detail)

  return (
    <section className="dashboard-card audit-detail-card">
      <div className="audit-detail-card__header">
        <div>
          <p className="section-tag">Investigation detail</p>
          <strong>Event {getAuditLogId(detail) ?? logId}</strong>
        </div>
        <span className={`audit-status-pill audit-status-pill--${status.tone}`}>{status.label}</span>
      </div>

      <div className="audit-detail-grid">
        <div>
          <p className="signal-label">Conversation</p>
          <p>{conversationId ?? 'No conversation linked'}</p>
        </div>
        <div>
          <p className="signal-label">Trace ID</p>
          <p className="audit-code">{getTraceId(detail)}</p>
        </div>
        <div>
          <p className="signal-label">User</p>
          <p>{getUserLabel(detail)}</p>
        </div>
        <div>
          <p className="signal-label">Tool</p>
          <p>{getToolLabel(detail)}</p>
        </div>
        <div>
          <p className="signal-label">Agent group</p>
          <p>{getAgentGroup(detail)}</p>
        </div>
        <div>
          <p className="signal-label">HTTP status</p>
          <p>{getHttpStatus(detail)}</p>
        </div>
        <div>
          <p className="signal-label">Started</p>
          <p>{formatDateTime(getEventTime(detail))}</p>
        </div>
        <div>
          <p className="signal-label">Finished</p>
          <p>{formatDateTime(getFinishedTime(detail))}</p>
        </div>
      </div>

      <div className="audit-scope-card">
        <div>
          <p className="section-tag">Exact scope used</p>
          <p className="panel-copy">
            Stored values from the audit event at execution time. Sensitive request headers and bearer tokens are
            intentionally not rendered here.
          </p>
        </div>

        {scopeList.length > 0 ? (
          <div className="audit-scope-list">
            {scopeList.map((scope) => (
              <span key={scope} className="audit-scope-chip">
                {scope}
              </span>
            ))}
          </div>
        ) : (
          <p className="audit-empty-copy">No stored scope was returned for this event.</p>
        )}
      </div>

      <div>
        <p className="section-tag">Error summary</p>
        <p className="audit-detail-error">{getErrorMessage(detail)}</p>
      </div>
    </section>
  )
}

export function AuditLogsPage() {
  const navigate = useNavigate()
  const clearSession = useAuthStore((state) => state.clearSession)
  const session = useAuthStore((state) => state.session)
  const user = session?.user

  const [filterDraft, setFilterDraft] = useState(DEFAULT_FILTERS)
  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [selectedLogId, setSelectedLogId] = useState(null)
  const [selectedEntry, setSelectedEntry] = useState(null)

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['audit-logs', filters, page, pageSize],
    queryFn: () =>
      auditService.getAuditLogs({
        ...filters,
        page,
        pageSize,
      }),
  })

  const normalized = useMemo(() => normalizeAuditLogList(data), [data])
  const rows = normalized.rows
  const pagination = normalized.pagination
  const total = Number(pagination?.totalItems) || 0
  const totalPages = Number(pagination?.totalPages) || (total > 0 ? Math.max(1, Math.ceil(total / pageSize)) : 1)
  const currentPage = Number(pagination?.page) || page
  const canGoPrevious = page > 1
  const canGoNext = total > 0 ? page < totalPages : rows.length === pageSize

  function handleLogout() {
    clearSession()
    navigate('/', { replace: true })
  }

  function updateDraft(name, value) {
    setFilterDraft((current) => ({
      ...current,
      [name]: value,
    }))
  }

  function applyFilters(event) {
    event.preventDefault()
    setFilters(filterDraft)
    setPage(1)
    setSelectedLogId(null)
    setSelectedEntry(null)
  }

  function resetFilters() {
    setFilterDraft(DEFAULT_FILTERS)
    setFilters(DEFAULT_FILTERS)
    setPage(1)
    setSelectedLogId(null)
    setSelectedEntry(null)
  }

  function inspectEntry(entry) {
    setSelectedLogId(getAuditLogId(entry))
    setSelectedEntry(entry)
  }

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
            <p>Security investigation access is active for this admin session.</p>
          </div>
          <div className="identity-card">
            <span className="signal-label">Investigation view</span>
            <strong>{total > 0 ? `${total} logged events` : 'Audit review'}</strong>
            <p>
                    Showing {formatShortDate(filters.dateFrom)} to {formatShortDate(filters.dateTo)} with pagination and
                    safe fallback labels for denied or partially trusted rows.
            </p>
          </div>
        </div>

        <div style={{ marginTop: 'auto', display: 'grid', gap: '0.5rem' }}>
          <button className="ghost-button" type="button" onClick={() => navigate('/admin/roles')}>
            Manage Roles
          </button>
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
          <p className="section-tag">Audit Logs</p>
          <h1>Security Investigation Dashboard</h1>
          <p className="panel-copy">
            Review AI tool-call evidence by user, date, tool, trace, and outcome. Denied and partially trusted rows
            stay visible so investigators can inspect what happened without exposing raw secrets.
          </p>

          <form className="audit-filter-grid" onSubmit={applyFilters}>
            <label className="field-group">
              <span className="field-meta">User</span>
              <input
                id="audit-user-filter"
                className="field-control"
                type="text"
                placeholder="Name, email, or ID"
                value={filterDraft.user}
                onChange={(event) => updateDraft('user', event.target.value)}
              />
            </label>

            <label className="field-group">
              <span className="field-meta">Tool name</span>
              <input
                id="audit-tool-filter"
                className="field-control"
                type="text"
                placeholder="get_my_checklist"
                value={filterDraft.tool}
                onChange={(event) => updateDraft('tool', event.target.value)}
              />
            </label>

            <label className="field-group">
              <span className="field-meta">From date</span>
              <input
                id="audit-from-date"
                className="field-control"
                type="date"
                value={filterDraft.dateFrom}
                onChange={(event) => updateDraft('dateFrom', event.target.value)}
              />
            </label>

            <label className="field-group">
              <span className="field-meta">To date</span>
              <input
                id="audit-to-date"
                className="field-control"
                type="date"
                value={filterDraft.dateTo}
                onChange={(event) => updateDraft('dateTo', event.target.value)}
              />
            </label>

            <label className="field-group">
              <span className="field-meta">Result</span>
              <select
                id="audit-result-filter"
                className="field-control"
                value={filterDraft.success}
                onChange={(event) => updateDraft('success', event.target.value)}
              >
                <option value="">All events</option>
                <option value="true">Successful only</option>
                <option value="false">Denied or failed only</option>
              </select>
            </label>

            <label className="field-group">
              <span className="field-meta">Trace lookup</span>
              <input
                id="audit-trace-filter"
                className="field-control"
                type="text"
                placeholder="trace-..."
                value={filterDraft.trace}
                onChange={(event) => updateDraft('trace', event.target.value)}
              />
            </label>

            <div className="audit-filter-actions">
              <button className="submit-button" type="submit">
                Apply filters
              </button>
              <button className="ghost-button" type="button" onClick={resetFilters}>
                Reset
              </button>
            </div>
          </form>
        </header>

        <section className="dashboard-card audit-table-card">
          <div className="audit-table-toolbar">
            <div>
              <p className="section-tag">Event table</p>
              <p className="panel-copy">
                Each row preserves investigation context even when verified foreign keys are missing.
              </p>
            </div>

            <div className="audit-toolbar-actions">
              <label className="field-group audit-page-size-field">
                <span className="field-meta">Rows per page</span>
                <select
                  id="audit-page-size"
                  className="field-control"
                  value={pageSize}
                  onChange={(event) => {
                    setPageSize(Number(event.target.value))
                    setPage(1)
                  }}
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </label>
              <button className="ghost-button audit-inline-button" type="button" onClick={() => refetch()}>
                Refresh
              </button>
            </div>
          </div>

          {isLoading ? (
            <div className="audit-state-card">
              <strong>Loading audit events...</strong>
              <p>Fetching paginated investigation data from the backend.</p>
            </div>
          ) : isError ? (
            <div className="audit-state-card audit-state-card--error">
              <strong>Could not load audit events</strong>
              <p>{getQueryErrorMessage(error, 'The audit logs endpoint did not return data.')}</p>
              <button className="ghost-button audit-inline-button" type="button" onClick={() => refetch()}>
                Retry list
              </button>
            </div>
          ) : rows.length === 0 ? (
            <div className="audit-state-card">
              <strong>No audit events match the current filters</strong>
              <p>Try broadening the date range, user filter, or tool lookup.</p>
            </div>
          ) : (
            <>
              <div className="audit-table-wrapper">
                <table className="audit-table">
                  <thead>
                    <tr>
                      <th>Event time</th>
                      <th>Result</th>
                      <th>HTTP</th>
                      <th>User</th>
                      <th>Tool</th>
                      <th>Trace ID</th>
                      <th>Conversation ID</th>
                      <th>Inspect</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, index) => {
                      const logId = getAuditLogId(row) ?? `${getTraceId(row)}-${index}`
                      const status = getResultState(row)
                      const conversationId = getConversationId(row)
                      const isSelected = selectedLogId === logId

                      return (
                        <tr key={logId} className={isSelected ? 'audit-table-row is-selected' : 'audit-table-row'}>
                          <td>{formatDateTime(getEventTime(row))}</td>
                          <td>
                            <span className={`audit-status-pill audit-status-pill--${status.tone}`}>
                              {status.label}
                            </span>
                          </td>
                          <td>{getHttpStatus(row)}</td>
                          <td>{getUserLabel(row)}</td>
                          <td>{getToolLabel(row)}</td>
                          <td className="audit-code">{getTraceId(row)}</td>
                          <td>
                            {conversationId ? (
                              <button
                                type="button"
                                className="audit-link-button"
                                onClick={() => inspectEntry(row)}
                              >
                                {conversationId}
                              </button>
                            ) : (
                              <span className="audit-fallback-label">No conversation linked</span>
                            )}
                          </td>
                          <td>
                            <button
                              type="button"
                              className="ghost-button audit-inline-button"
                              onClick={() => inspectEntry(row)}
                            >
                              Inspect
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              <div className="audit-pagination">
                <p className="panel-copy">
                    {total > 0
                     ? `Showing page ${currentPage} of ${totalPages} • ${total} total events`
                     : `Showing page ${currentPage}${isFetching ? ' • refreshing...' : ''}`}
                </p>
                <div className="audit-pagination__actions">
                  <button
                    className="ghost-button audit-inline-button"
                    type="button"
                    onClick={() => setPage((current) => current - 1)}
                    disabled={!canGoPrevious}
                  >
                    Previous
                  </button>
                  <button
                    className="ghost-button audit-inline-button"
                    type="button"
                    onClick={() => setPage((current) => current + 1)}
                    disabled={!canGoNext}
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          )}
        </section>

        <AuditLogDetailPanel logId={selectedLogId} selectedEntry={selectedEntry} />
      </section>
    </main>
  )
}
