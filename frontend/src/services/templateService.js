import api from './axios';

export const templateService = {
  getTemplates: async () => {
    const response = await api.get('/templates');
    return response.data;
  },
  getTemplateById: async (id) => {
    const response = await api.get(`/templates/${id}`);
    return response.data;
  },
  createTemplate: async (data) => {
    const response = await api.post('/templates', data);
    return response.data;
  },
  updateTemplate: async (id, data) => {
    const response = await api.put(`/templates/${id}`, data);
    return response.data;
  },
  deleteTemplate: async (id) => {
    const response = await api.delete(`/templates/${id}`);
    return response.data;
  },
  startWorkoutFromTemplate: async (id, date) => {
    const response = await api.post(`/templates/${id}/start-workout`, { date });
    return response.data;
  },
};
