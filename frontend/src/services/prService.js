import api from './axios';

export const prService = {
  getPRs: async () => {
    const response = await api.get('/prs');
    return response.data;
  },
  getPRRecords: async () => {
    const response = await api.get('/prs');
    return response.data;
  },
  getPRById: async (id) => {
    const response = await api.get(`/prs/${id}`);
    return response.data;
  },
  createPR: async (data) => {
    const response = await api.post('/prs', data);
    return response.data;
  },
  updatePR: async (id, data) => {
    const response = await api.put(`/prs/${id}`, data);
    return response.data;
  },
  deletePR: async (id) => {
    const response = await api.delete(`/prs/${id}`);
    return response.data;
  },
};
