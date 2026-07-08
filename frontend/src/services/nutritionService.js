import api from './axios';

export const nutritionService = {
  getNutritionLogs: async () => {
    const response = await api.get('/nutrition');
    return response.data;
  },
  getNutritionById: async (id) => {
    const response = await api.get(`/nutrition/${id}`);
    return response.data;
  },
  createNutritionLog: async (data) => {
    const response = await api.post('/nutrition', data);
    return response.data;
  },
  updateNutritionLog: async (id, data) => {
    const response = await api.put(`/nutrition/${id}`, data);
    return response.data;
  },
  deleteNutritionLog: async (id) => {
    const response = await api.delete(`/nutrition/${id}`);
    return response.data;
  },
};
