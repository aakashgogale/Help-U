import api from './api';

export const landingService = {
  getLandingConfig: async () => {
    try {
      const response = await api.get('/public/landing-config');
      return response.data;
    } catch (error) {
      console.error('Failed to fetch public landing config:', error);
      return { success: false, error };
    }
  },

  submitPartnerLead: async (leadData) => {
    try {
      const response = await api.post('/public/partner-lead', leadData);
      return response.data;
    } catch (error) {
      console.error('Failed to submit partner lead:', error);
      throw error.response?.data || error;
    }
  },

  submitContactInquiry: async (inquiryData) => {
    try {
      const response = await api.post('/public/contact-inquiry', inquiryData);
      return response.data;
    } catch (error) {
      console.error('Failed to submit contact inquiry:', error);
      throw error.response?.data || error;
    }
  }
};

export default landingService;
