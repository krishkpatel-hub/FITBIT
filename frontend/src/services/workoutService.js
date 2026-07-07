import api from './axios';

export const workoutService = {
  getWorkouts: () => api.get('/workouts'),
  createWorkout: (workoutData) => api.post('/workouts', workoutData),
};

