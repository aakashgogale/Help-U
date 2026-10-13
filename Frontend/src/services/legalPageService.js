import api from './api';

/**
 * Public legal/help pages: Terms & Conditions, Privacy Policy, FAQ.
 * Content is admin-managed; see modules/admin/pages/LegalPages.
 */
export const legalPageService = {
  get: async (slug) => {
    const response = await api.get(`/public/legal-pages/${slug}`);
    return response.data;
  }
};

export default legalPageService;
