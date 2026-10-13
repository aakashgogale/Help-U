import api from '../../../services/api';

export const legalPageService = {
  getAll: async () => {
    const response = await api.get('/admin/legal-pages');
    return response.data;
  },
  getOne: async (slug) => {
    const response = await api.get(`/admin/legal-pages/${slug}`);
    return response.data;
  },
  update: async (slug, data) => {
    const response = await api.put(`/admin/legal-pages/${slug}`, data);
    return response.data;
  }
};

export default legalPageService;
