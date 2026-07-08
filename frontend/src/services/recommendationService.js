import api from './axios';

export const recommendationService = {
  getRecommendations: async () => {
    const response = await api.get('/recommendations');
    return response.data;
  },
};

