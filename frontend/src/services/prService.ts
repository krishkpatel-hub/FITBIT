import api from './axios';
import type { ApiSuccess, Id, PersonalRecord } from '../types/domain';

export type PersonalRecordRequest = Omit<Partial<PersonalRecord>, '_id' | 'user'> & Pick<PersonalRecord, 'exerciseName'>;

export const prService = {
  getPRs: async (): Promise<ApiSuccess<PersonalRecord[]>> => {
    const response = await api.get('/prs');
    return response.data;
  },
  getPRRecords: async (): Promise<ApiSuccess<PersonalRecord[]>> => {
    const response = await api.get('/prs');
    return response.data;
  },
  getPRById: async (id: Id): Promise<ApiSuccess<PersonalRecord>> => {
    const response = await api.get(`/prs/${id}`);
    return response.data;
  },
  createPR: async (data: PersonalRecordRequest): Promise<ApiSuccess<PersonalRecord>> => {
    const response = await api.post('/prs', data);
    return response.data;
  },
  updatePR: async (id: Id, data: Partial<PersonalRecordRequest>): Promise<ApiSuccess<PersonalRecord>> => {
    const response = await api.put(`/prs/${id}`, data);
    return response.data;
  },
  deletePR: async (id: Id): Promise<ApiSuccess<{ id: Id; message: string }>> => {
    const response = await api.delete(`/prs/${id}`);
    return response.data;
  },
};
