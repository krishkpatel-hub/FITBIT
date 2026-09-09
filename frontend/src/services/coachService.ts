import api from './axios';
import type { ApiSuccess, CoachChatResponse, CoachInsight } from '../types/domain';

export const coachService = {
  getCoachInsights: async (): Promise<ApiSuccess<CoachInsight[]>> => {
    const response = await api.get('/coach/insights');
    return response.data;
  },
  sendCoachMessage: async (message: string): Promise<ApiSuccess<CoachChatResponse>> => {
    const response = await api.post('/coach/chat', { message });
    return response.data;
  },
};
