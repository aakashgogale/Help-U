const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middleware/authMiddleware');
const { isAdmin, requirePermission } = require('../../middleware/roleMiddleware');
const {
  adminListDisputes,
  adminGetDispute,
  adminPostMessage,
  adminUpdateDispute,
  adminResolveDispute
} = require('../../controllers/disputeController');

router.use(authenticate, isAdmin, requirePermission('disputes'));

router.get('/', adminListDisputes);
router.get('/:id', adminGetDispute);
router.put('/:id', adminUpdateDispute);
router.post('/:id/messages', adminPostMessage);
router.post('/:id/resolve', adminResolveDispute);

module.exports = router;
