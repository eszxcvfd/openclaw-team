import { apiClient } from './apiClient';

export const userService = {
  getUsers: async () => {
    const response = await apiClient.get('/api/users');
    return response.data;
  },

  updateAgentAccess: async (userId, agentGroupCode, isAllowed) => {
    const response = await apiClient.put(`/api/users/${userId}/access`, {
      agentGroupCode,
      isAllowed,
    });
    return response.data;
  },
};
