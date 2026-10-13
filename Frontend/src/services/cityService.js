import api from './api';

export const cityService = {
  // Get active cities
  getActive: async () => {
    const response = await api.get('/public/cities');
    return response.data;
  },

  // Get areas of a city
  getAreas: async (cityId) => {
    const response = await api.get(`/public/cities/${cityId}/areas`);
    return response.data;
  },

  // Check pincode serviceability
  checkPincode: async (pincode, cityId) => {
    const response = await api.get('/public/cities/check-pincode', {
      params: { pincode, cityId }
    });
    return response.data;
  }
};

export default cityService;
