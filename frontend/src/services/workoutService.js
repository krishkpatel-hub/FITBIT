import api from './axios';

export const workoutService = {
  getWorkouts: async () => {
    const response = await api.get('/workouts');
    return response.data;
  },
  getWorkoutById: async (id) => {
    const response = await api.get(`/workouts/${id}`);
    return response.data;
  },
  createWorkout: async (workoutData) => {
    const response = await api.post('/workouts', workoutData);
    return response.data;
  },
  updateWorkout: async (id, workoutData) => {
    const response = await api.put(`/workouts/${id}`, workoutData);
    return response.data;
  },
  duplicateWorkout: async (id, date) => {
    const response = await api.post(`/workouts/${id}/duplicate`, { date });
    return response.data;
  },
  deleteWorkout: async (id) => {
    const response = await api.delete(`/workouts/${id}`);
    return response.data;
  },
};
