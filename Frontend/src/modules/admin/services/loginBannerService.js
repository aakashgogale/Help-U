import api from '../../../services/api';

export const loginBannerService = {
  getAll: async (app = '') => {
    const params = app ? { app } : {};
    const response = await api.get('/admin/login-banners', { params });
    return response.data;
  },

  create: async (data) => {
    const response = await api.post('/admin/login-banners', data);
    return response.data;
  },

  update: async (id, data) => {
    const response = await api.put(`/admin/login-banners/${id}`, data);
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/admin/login-banners/${id}`);
    return response.data;
  },

  toggleStatus: async (id) => {
    const response = await api.patch(`/admin/login-banners/${id}/toggle`);
    return response.data;
  },

  reorder: async (bannerIds) => {
    const response = await api.post('/admin/login-banners/reorder', { bannerIds });
    return response.data;
  },

  seedDefaults: async (app = 'all') => {
    const response = await api.post('/admin/login-banners/seed-defaults', { app });
    return response.data;
  },

  getConfig: async () => {
    const response = await api.get('/admin/login-banners/config');
    return response.data;
  },

  updateConfig: async (config) => {
    const response = await api.put('/admin/login-banners/config', config);
    return response.data;
  }
};

export default loginBannerService;

