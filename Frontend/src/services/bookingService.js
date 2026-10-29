import api from './api';

/**
 * Booking Service
 * Handles all API calls for Bookings
 */

export const bookingService = {
  // Create a new booking
  create: async (bookingData) => {
    console.log('[BookingService] Creating booking with payload:', JSON.stringify(bookingData, null, 2));
    const response = await api.post('/users/bookings', bookingData);
    return response.data;
  },

  // Upload one checkout photo of the problem (base64 data URL); returns { success, url }
  uploadIssuePhoto: async (photo) => {
    const response = await api.post('/users/bookings/issue-photos', { photo });
    return response.data;
  },

  // Get user bookings with filters
  getUserBookings: async (params = {}) => {
    const queryParams = new URLSearchParams();
    if (params.status) queryParams.append('status', params.status);
    if (params.startDate) queryParams.append('startDate', params.startDate);
    if (params.endDate) queryParams.append('endDate', params.endDate);
    if (params.page) queryParams.append('page', params.page);
    if (params.limit) queryParams.append('limit', params.limit);

    const response = await api.get(`/users/bookings${queryParams.toString() ? `?${queryParams.toString()}` : ''}`);
    return response.data;
  },

  // Get booking details by ID
  getById: async (id) => {
    const response = await api.get(`/users/bookings/${id}`);
    return response.data;
  },

  // Repair services the customer adds after the professional's inspection
  getExtraServices: async (id) => {
    const response = await api.get(`/users/bookings/${id}/extra-services`);
    return response.data;
  },

  // items: [{ serviceId, quantity }], otherNote: free-text problem (optional)
  updateExtraServices: async (id, { items, otherNote }) => {
    const response = await api.put(`/users/bookings/${id}/extra-services`, { items, otherNote });
    return response.data;
  },

  // Change the answers on a booking's items: [{ itemId, details: { key: value } }]
  updateDetails: async (id, items) => {
    const response = await api.put(`/users/bookings/${id}/details`, { items });
    return response.data;
  },

  // What cancelling would cost right now ({ fee, isFree, stage, freeUntil })
  getCancellationPreview: async (id) => {
    const response = await api.get(`/users/bookings/${id}/cancellation-preview`);
    return response.data;
  },

  // Cancel booking
  cancel: async (id, cancellationReason) => {
    const reason = typeof cancellationReason === 'object'
      ? (cancellationReason?.cancellationReason || cancellationReason?.reason || '')
      : (cancellationReason || '');
    const response = await api.post(`/users/bookings/${id}/cancel`, { cancellationReason: reason });
    return response.data;
  },

  // Reschedule booking
  reschedule: async (id, rescheduleData) => {
    const response = await api.put(`/users/bookings/${id}/reschedule`, rescheduleData);
    return response.data;
  },

  // Accept or decline the new time the professional asked for
  respondToRescheduleRequest: async (id, accept) => {
    const response = await api.post(`/users/bookings/${id}/reschedule-request/respond`, { accept });
    return response.data;
  },

  // Add review and rating
  addReview: async (id, reviewData) => {
    const response = await api.post(`/users/bookings/${id}/review`, reviewData);
    return response.data;
  },

  // Get user ratings and reviews
  getRatings: async (params = {}) => {
    const response = await api.get('/users/bookings/ratings', { params });
    return response.data;
  }
};

export default bookingService;

