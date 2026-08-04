import api from './axios';
import type { ApiSuccess, Id, ProgressLog } from '../types/domain';

export type ProgressLogRequest = Omit<Partial<ProgressLog>, '_id' | 'user'>;

export const progressService = {
  getProgressLogs: async (): Promise<ApiSuccess<ProgressLog[]>> => {
    const response = await api.get('/progress');
    return response.data;
  },
  getProgressById: async (id: Id): Promise<ApiSuccess<ProgressLog>> => {
    const response = await api.get(`/progress/${id}`);
    return response.data;
  },
  createProgressLog: async (data: ProgressLogRequest): Promise<ApiSuccess<ProgressLog>> => {
    const response = await api.post('/progress', data);
    return response.data;
  },
  updateProgressLog: async (id: Id, data: Partial<ProgressLogRequest>): Promise<ApiSuccess<ProgressLog>> => {
    const response = await api.put(`/progress/${id}`, data);
    return response.data;
  },
  deleteProgressLog: async (id: Id): Promise<ApiSuccess<{ id: Id; message: string }>> => {
    const response = await api.delete(`/progress/${id}`);
    return response.data;
  },
};
