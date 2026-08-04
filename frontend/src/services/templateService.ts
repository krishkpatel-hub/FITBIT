import api from './axios';
import type { ApiSuccess, Id, Workout, WorkoutTemplate } from '../types/domain';

export type WorkoutTemplateRequest = Omit<Partial<WorkoutTemplate>, '_id' | 'user'> & Pick<WorkoutTemplate, 'name'>;

export const templateService = {
  getTemplates: async (): Promise<ApiSuccess<WorkoutTemplate[]>> => {
    const response = await api.get('/templates');
    return response.data;
  },
  getTemplateById: async (id: Id): Promise<ApiSuccess<WorkoutTemplate>> => {
    const response = await api.get(`/templates/${id}`);
    return response.data;
  },
  createTemplate: async (data: WorkoutTemplateRequest): Promise<ApiSuccess<WorkoutTemplate>> => {
    const response = await api.post('/templates', data);
    return response.data;
  },
  updateTemplate: async (id: Id, data: Partial<WorkoutTemplateRequest>): Promise<ApiSuccess<WorkoutTemplate>> => {
    const response = await api.put(`/templates/${id}`, data);
    return response.data;
  },
  deleteTemplate: async (id: Id): Promise<ApiSuccess<{ id: Id; message: string }>> => {
    const response = await api.delete(`/templates/${id}`);
    return response.data;
  },
  startWorkoutFromTemplate: async (id: Id, date: string): Promise<ApiSuccess<Workout>> => {
    const response = await api.post(`/templates/${id}/start-workout`, { date });
    return response.data;
  },
};
