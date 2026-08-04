import api from './axios';
import type { ApiSuccess, Id, Workout } from '../types/domain';

export type WorkoutRequest = Omit<Partial<Workout>, '_id' | 'user'> & Pick<Workout, 'title'>;

export const workoutService = {
  getWorkouts: async (): Promise<ApiSuccess<Workout[]>> => {
    const response = await api.get('/workouts');
    return response.data;
  },
  getWorkoutById: async (id: Id): Promise<ApiSuccess<Workout>> => {
    const response = await api.get(`/workouts/${id}`);
    return response.data;
  },
  createWorkout: async (workoutData: WorkoutRequest): Promise<ApiSuccess<Workout>> => {
    const response = await api.post('/workouts', workoutData);
    return response.data;
  },
  updateWorkout: async (id: Id, workoutData: Partial<WorkoutRequest>): Promise<ApiSuccess<Workout>> => {
    const response = await api.put(`/workouts/${id}`, workoutData);
    return response.data;
  },
  duplicateWorkout: async (id: Id, date: string): Promise<ApiSuccess<Workout>> => {
    const response = await api.post(`/workouts/${id}/duplicate`, { date });
    return response.data;
  },
  deleteWorkout: async (id: Id): Promise<ApiSuccess<{ id: Id; message: string }>> => {
    const response = await api.delete(`/workouts/${id}`);
    return response.data;
  },
};
