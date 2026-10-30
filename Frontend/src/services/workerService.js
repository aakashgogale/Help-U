import api from './api';

const workerService = {
  // Get worker profile
  getProfile: async () => {
    const response = await api.get('/workers/profile');
    return response.data;
  },

  // Update worker profile
  updateProfile: async (profileData) => {
    const response = await api.put('/workers/profile', profileData);
    return response.data;
  },

  // Update worker address
  updateAddress: async (addressData) => {
    const response = await api.put('/workers/address', addressData);
    return response.data;
  },

  // Saved addresses (one of them is the base location jobs are matched on)
  getAddresses: async () => {
    const response = await api.get('/workers/addresses');
    return response.data;
  },

  addAddress: async (addressData) => {
    const response = await api.post('/workers/addresses', addressData);
    return response.data;
  },

  updateSavedAddress: async (id, addressData) => {
    const response = await api.put(`/workers/addresses/${id}`, addressData);
    return response.data;
  },

  setBaseAddress: async (id) => {
    const response = await api.put(`/workers/addresses/${id}/activate`);
    return response.data;
  },

  deleteAddress: async (id) => {
    const response = await api.delete(`/workers/addresses/${id}`);
    return response.data;
  },

  // Update real-time location
  updateLocation: async (lat, lng) => {
    return api.put('/workers/profile/location', { lat, lng });
  },

  // Get dashboard stats
  getDashboardStats: async () => {
    const response = await api.get('/workers/dashboard/stats');
    return response.data;
  },

  // Get revenue analytics
  getRevenueAnalytics: async (period) => {
    const response = await api.get(`/workers/dashboard/revenue?period=${period}`);
    return response.data;
  }
};

export default workerService;
