import api from './axios';
import type { ApiMessage } from '../types/domain';

export const demoService = {
  seedDemoData: async (): Promise<ApiMessage> => {
    const response = await api.post('/demo/seed');
    return response.data;
  },
};
