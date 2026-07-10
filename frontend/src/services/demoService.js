import api from './axios';

export const demoService = {
  seedDemoData: async () => {
    const response = await api.post('/demo/seed');
    return response.data;
  },
};
