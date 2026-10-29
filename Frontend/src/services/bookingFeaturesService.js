import api from './api';

/**
 * Booking features shared by the user and worker apps: booking options,
 * problem videos, chat, disputes, recurring plans and customer referrals.
 *
 * `role` is 'user' or 'worker' and picks the API prefix; the token is chosen
 * by api.js from the current page.
 */
const prefix = (role) => (role === 'worker' ? '/workers' : '/users');

export const bookingFeaturesService = {
  // ── Checkout ─────────────────────────────────────────────
  getBookingOptions: async (serviceId) => {
    const response = await api.get('/public/booking-options', { params: { serviceId } });
    return response.data;
  },

  // Multipart upload of one problem video; onProgress receives 0-100.
  uploadIssueVideo: async (file, onProgress) => {
    const form = new FormData();
    form.append('video', file);
    const response = await api.post('/users/bookings/issue-videos', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 10 * 60 * 1000,
      onUploadProgress: (e) => {
        if (onProgress && e.total) onProgress(Math.round((e.loaded / e.total) * 100));
      }
    });
    return response.data;
  },

  // ── Chat ─────────────────────────────────────────────────
  getChat: async (role, bookingId, params = {}) => {
    const response = await api.get(`${prefix(role)}/bookings/${bookingId}/chat`, { params });
    return response.data;
  },
  sendChatMessage: async (role, bookingId, { message, image }) => {
    const response = await api.post(`${prefix(role)}/bookings/${bookingId}/chat`, { message, image });
    return response.data;
  },
  markChatRead: async (role, bookingId) => {
    const response = await api.post(`${prefix(role)}/bookings/${bookingId}/chat/read`);
    return response.data;
  },
  getChatUnread: async (role, bookingId) => {
    const response = await api.get(`${prefix(role)}/bookings/${bookingId}/chat/unread`);
    return response.data;
  },

  // ── Disputes ─────────────────────────────────────────────
  listDisputes: async (role, params = {}) => {
    const response = await api.get(`${prefix(role)}/disputes`, { params });
    return response.data;
  },
  getDispute: async (role, id) => {
    const response = await api.get(`${prefix(role)}/disputes/${id}`);
    return response.data;
  },
  getBookingDisputeInfo: async (role, bookingId) => {
    const response = await api.get(`${prefix(role)}/disputes/booking/${bookingId}`);
    return response.data;
  },
  raiseDispute: async (role, data) => {
    const response = await api.post(`${prefix(role)}/disputes`, data);
    return response.data;
  },
  postDisputeMessage: async (role, id, data) => {
    const response = await api.post(`${prefix(role)}/disputes/${id}/messages`, data);
    return response.data;
  },
  uploadDisputeEvidence: async (role, dataUrl) => {
    const response = await api.post(`${prefix(role)}/disputes/evidence`, { file: dataUrl });
    return response.data;
  },

  // ── Recurring bookings (customer) ───────────────────────
  listRecurring: async (params = {}) => {
    const response = await api.get('/users/recurring-bookings', { params });
    return response.data;
  },
  getRecurring: async (id) => {
    const response = await api.get(`/users/recurring-bookings/${id}`);
    return response.data;
  },
  updateRecurring: async (id, action) => {
    const response = await api.post(`/users/recurring-bookings/${id}/${action}`);
    return response.data;
  },

  // ── Worker job cancellation ─────────────────────────────
  getCancelJobPreview: async (bookingId) => {
    const response = await api.get(`/workers/bookings/${bookingId}/cancel-preview`);
    return response.data;
  },
  cancelJob: async (bookingId, reason) => {
    const response = await api.post(`/workers/bookings/${bookingId}/cancel`, { reason });
    return response.data;
  },

  requestReschedule: async (bookingId, payload) => {
    const response = await api.post(`/workers/bookings/${bookingId}/reschedule-request`, payload);
    return response.data;
  },

  // ── Customer referrals ──────────────────────────────────
  getReferralStats: async () => {
    const response = await api.get('/users/referrals/stats');
    return response.data;
  },
  getReferralHistory: async (params = {}) => {
    const response = await api.get('/users/referrals/history', { params });
    return response.data;
  },
  validateReferralCode: async (code) => {
    const response = await api.post('/users/referrals/validate', { code });
    return response.data;
  }
};

export default bookingFeaturesService;
