import api from './axios';

export const coachService = {
  getCoachInsights: async () => {
    const response = await api.get('/coach/insights');
    return response.data;
  },
};
