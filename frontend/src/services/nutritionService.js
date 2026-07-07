import api from './axios';

export const nutritionService = {
  getNutritionEntries: () => api.get('/nutrition'),
  createNutritionEntry: (nutritionData) => api.post('/nutrition', nutritionData),
};

