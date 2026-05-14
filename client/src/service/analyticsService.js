// client/src/services/analyticsService.js
import api from '../utils/axios';

export const analyticsService = {
  getDashboardStats: async () => {
    const response = await api.get('/analytics/dashboard');
    return response.data.data;
  }
};

export default analyticsService;