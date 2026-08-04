import api from './axios';
import type { ApiMessage, ApiSuccess, Exercise, Id } from '../types/domain';

export type ExerciseRequest = Omit<Partial<Exercise>, '_id' | 'user'> & Pick<Exercise, 'name'>;

export const exerciseService = {
  getExercises: async (): Promise<ApiSuccess<Exercise[]>> => {
    const response = await api.get('/exercises');
    return response.data;
  },
  getExerciseById: async (id: Id): Promise<ApiSuccess<Exercise>> => {
    const response = await api.get(`/exercises/${id}`);
    return response.data;
  },
  createExercise: async (exerciseData: ExerciseRequest): Promise<ApiSuccess<Exercise>> => {
    const response = await api.post('/exercises', exerciseData);
    return response.data;
  },
  updateExercise: async (id: Id, exerciseData: Partial<ExerciseRequest>): Promise<ApiSuccess<Exercise>> => {
    const response = await api.put(`/exercises/${id}`, exerciseData);
    return response.data;
  },
  deleteExercise: async (id: Id): Promise<ApiSuccess<ApiMessage & { id: Id }>> => {
    const response = await api.delete(`/exercises/${id}`);
    return response.data;
  },
};
