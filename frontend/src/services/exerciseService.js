import api from './axios';

export const exerciseService = {
  getExercises: async () => {
    const response = await api.get('/exercises');
    return response.data;
  },
  getExerciseById: async (id) => {
    const response = await api.get(`/exercises/${id}`);
    return response.data;
  },
  createExercise: async (exerciseData) => {
    const response = await api.post('/exercises', exerciseData);
    return response.data;
  },
  updateExercise: async (id, exerciseData) => {
    const response = await api.put(`/exercises/${id}`, exerciseData);
    return response.data;
  },
  deleteExercise: async (id) => {
    const response = await api.delete(`/exercises/${id}`);
    return response.data;
  },
};
