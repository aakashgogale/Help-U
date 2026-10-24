const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middleware/authMiddleware');
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
router.post('/:id/initiate', requireFlag('isCashEnabled', 'Cash collection is currently unavailable.'), initiateCashCollection);
router.post('/:id/initiate-online', requireFlag('isOnlinePaymentEnabled', 'Online payment is currently unavailable.'), initiateOnlineCollection);
router.post('/:id/retract-bill', retractBill);
router.post('/:id/confirm', confirmCashCollection);

// Explicit verification route
router.post('/:id/verify-online', verifyOnlinePayment);
router.post('/:id/confirm-manual-online', confirmManualOnlinePayment);

// Customer route
router.post('/:id/customer-confirm', customerConfirmPayment);

// Status route (read-only check)
router.get('/:id/status', getCashCollectionStatus);

module.exports = router;
