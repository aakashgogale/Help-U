import api from '../../../services/api';

export const landingAdminService = {
  getConfig: async () => {
    const response = await api.get('/admin/landing-config');
    return response.data;
  },

  updateConfig: async (data) => {
    const response = await api.put('/admin/landing-config', data);
    return response.data;
  },

  getPartnerLeads: async (params = {}) => {
    const response = await api.get('/admin/partner-leads', { params });
    return response.data;
  },

  updatePartnerLeadStatus: async (id, data) => {
    const response = await api.put(`/admin/partner-leads/${id}`, data);
    return response.data;
  },

  deletePartnerLead: async (id) => {
    const response = await api.delete(`/admin/partner-leads/${id}`);
    return response.data;
  }
};

export default landingAdminService;
