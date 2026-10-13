import api from './api';

export const couponService = {
  /**
   * Validate a coupon code for user checkout
   * @param {Object} data { code, orderAmount, categoryId, serviceId, cityId }
   */
  validateCoupon: async (data) => {
    const response = await api.post('/users/coupons/validate', data);
    return response.data;
  },

  /**
   * Get applicable/available coupons for user checkout
   * @param {Object} params { orderAmount, categoryId, serviceId, cityId }
   */
  getAvailableCoupons: async (params = {}) => {
    const response = await api.get('/users/coupons/available', { params });
    return response.data;
  },

  /**
   * Admin: List coupons
   */
  listCoupons: async (params = {}) => {
    const response = await api.get('/admin/coupons', { params });
    return response.data;
  },

  /**
   * Admin: Create coupon
   */
  createCoupon: async (data) => {
    const response = await api.post('/admin/coupons', data);
    return response.data;
  },

  /**
   * Admin: Update coupon
   */
  updateCoupon: async (id, data) => {
    const response = await api.put(`/admin/coupons/${id}`, data);
    return response.data;
  },

  /**
   * Admin: Delete coupon
   */
  deleteCoupon: async (id) => {
    const response = await api.delete(`/admin/coupons/${id}`);
    return response.data;
  },

  /**
   * Admin: Get coupon stats
   */
  getCouponStats: async (id) => {
    const response = await api.get(`/admin/coupons/${id}/stats`);
    return response.data;
  }
};

export default couponService;
