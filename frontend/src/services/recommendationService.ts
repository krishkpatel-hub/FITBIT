import api from './axios';
import type { ApiSuccess, Recommendation } from '../types/domain';

export const recommendationService = {
  getRecommendations: async (): Promise<ApiSuccess<Recommendation[]>> => {
    const response = await api.get('/recommendations');
    return response.data;
  },
};
