import api from './axios';

export const progressService = {
  getProgressLogs: async () => {
    const response = await api.get('/progress');
    return response.data;
  },
  getProgressById: async (id) => {
    const response = await api.get(`/progress/${id}`);
    return response.data;
  },
  createProgressLog: async (data) => {
    const response = await api.post('/progress', data);
    return response.data;
  },
  updateProgressLog: async (id, data) => {
    const response = await api.put(`/progress/${id}`, data);
    return response.data;
  },
  deleteProgressLog: async (id) => {
    const response = await api.delete(`/progress/${id}`);
    return response.data;
  },
};
