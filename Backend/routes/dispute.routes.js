/**
 * Dispute routes for the user and worker apps.
 * Mounted twice in server.js: /api/users/disputes and /api/workers/disputes.
 */
const express = require('express');
const { authenticate } = require('../middleware/authMiddleware');
const { isUser, isWorker } = require('../middleware/roleMiddleware');
const {
  listMyDisputes,
  getMyDispute,
  getBookingDisputeInfo,
  raiseDispute,
  postMyMessage,
  uploadEvidence
} = require('../controllers/disputeController');

const buildRouter = (roleGuard) => {
  const router = express.Router();
  router.use(authenticate, roleGuard);

  router.get('/', listMyDisputes);
  router.post('/', raiseDispute);
  router.post('/evidence', uploadEvidence);
  router.get('/booking/:bookingId', getBookingDisputeInfo);
  router.get('/:id', getMyDispute);
  router.post('/:id/messages', postMyMessage);

  return router;
};

module.exports = {
  userDisputeRoutes: buildRouter(isUser),
  workerDisputeRoutes: buildRouter(isWorker)
};
