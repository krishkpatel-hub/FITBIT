import api from './axios';
import type { ApiSuccess, CoachInsight } from '../types/domain';

export const coachService = {
  getCoachInsights: async (): Promise<ApiSuccess<CoachInsight[]>> => {
    const response = await api.get('/coach/insights');
    return response.data;
  },
};
