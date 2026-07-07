import api from './axios';

export const progressService = {
  getProgress: () => api.get('/progress'),
  createProgressEntry: (progressData) => api.post('/progress', progressData),
};

