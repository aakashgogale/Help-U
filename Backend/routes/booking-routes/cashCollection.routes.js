const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middleware/authMiddleware');
const { isWorker, isUser } = require('../../middleware/roleMiddleware');
const { requireFlag } = require('../../middleware/featureGuard');
const {
  initiateCashCollection,
  initiateOnlineCollection,
  retractBill,
  verifyOnlinePayment,
  confirmManualOnlinePayment,
  confirmCashCollection,
  customerConfirmPayment,
  getCashCollectionStatus
} = require('../../controllers/bookingControllers/cashCollectionController');

// All routes require authentication
router.use(authenticate);

// Worker routes
// Starting a collection honours the admin's cash / online switches. Confirming and verifying are
// deliberately not guarded: they finish a payment that is already under way.
router.post('/:id/initiate', isWorker, requireFlag('isCashEnabled', 'Cash collection is currently unavailable.'), initiateCashCollection);
router.post('/:id/initiate-online', isWorker, requireFlag('isOnlinePaymentEnabled', 'Online payment is currently unavailable.'), initiateOnlineCollection);
router.post('/:id/retract-bill', isWorker, retractBill);
router.post('/:id/confirm', isWorker, confirmCashCollection);

// Explicit verification route
router.post('/:id/verify-online', isWorker, verifyOnlinePayment);
router.post('/:id/confirm-manual-online', isWorker, confirmManualOnlinePayment);

// Customer route
router.post('/:id/customer-confirm', isUser, customerConfirmPayment);

// Status route (read-only check)
router.get('/:id/status', getCashCollectionStatus);

module.exports = router;
