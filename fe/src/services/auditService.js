import { apiClient } from './apiClient'

function buildAuditLogQueryParams(filters = {}) {
  return Object.entries({
    page: filters.page,
    pageSize: filters.pageSize,
    user: filters.user,
    tool: filters.tool,
    dateFrom: filters.dateFrom,
    dateTo: filters.dateTo,
    success: filters.success,
    trace: filters.trace,
  }).reduce((params, [key, value]) => {
    if (value === '' || value === null || value === undefined) {
      return params
    }

    params[key] = value
    return params
  }, {})
}

export const auditService = {
  async getAuditLogs(filters = {}) {
    const response = await apiClient.get('/api/audit-logs', {
      params: buildAuditLogQueryParams(filters),
    })

    return response.data
  },

  async getAuditLogDetail(logId) {
    const response = await apiClient.get(`/api/audit-logs/${logId}`)
    return response.data
  },
}
