import api from './axios';

export const trainingMaxService = {
  getTrainingMaxes: async () => {
    const response = await api.get('/training-maxes');
    return response.data;
  },
  getProgramWeeks: async () => {
    const response = await api.get('/training-maxes/program-weeks');
    return response.data;
  },
  createTrainingMax: async (data) => {
    const response = await api.post('/training-maxes', data);
    return response.data;
  },
  updateTrainingMax: async (id, data) => {
    const response = await api.put(`/training-maxes/${id}`, data);
    return response.data;
  },
  deleteTrainingMax: async (id) => {
    const response = await api.delete(`/training-maxes/${id}`);
    return response.data;
  },
  generateProgram: async (data = {}) => {
    const response = await api.post('/training-maxes/generate-program', data);
    return response.data;
  },
  updateProgression: async (data) => {
    const response = await api.post('/training-maxes/update-progression', data);
    return response.data;
  },
};
