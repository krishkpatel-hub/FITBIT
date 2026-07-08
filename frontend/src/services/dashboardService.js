import api from './axios';

export const dashboardService = {
  getDashboard: async () => {
    const response = await api.get('/dashboard');
    return response.data;
  },
  getDashboardData: async () => {
    const response = await api.get('/dashboard');
    return response.data;
  },
};
