import api from './api';

export const loginBannerPublicService = {
  getPublicBanners: async (app = 'user') => {
    try {
      const response = await api.get(`/public/login-banners?app=${encodeURIComponent(app)}`);
      return response.data;
    } catch (error) {
      console.warn('Failed to fetch public login banners:', error.message);
      return { success: false, banners: [] };
    }
  }
};

export default loginBannerPublicService;

