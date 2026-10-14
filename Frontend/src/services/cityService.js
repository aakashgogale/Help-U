import api from './api';

export const cityService = {
  // Get active cities
  getActive: async () => {
    const response = await api.get('/public/cities');
    return response.data;
  }
};

export default cityService;
