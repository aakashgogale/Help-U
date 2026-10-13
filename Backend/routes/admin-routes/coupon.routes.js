const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middleware/authMiddleware');
const { isAdmin, requirePermission } = require('../../middleware/roleMiddleware');
const {
  list,
  create,
  update,
  remove,
  stats
} = require('../../controllers/adminControllers/couponController');

// Coupons are a marketing/pricing tool, so they sit behind the same permission
// as the rest of the service catalogue.
router.use(authenticate, isAdmin, requirePermission('services'));

router.route('/')
  .get(list)
  .post(create);

router.get('/:id/stats', stats);

router.route('/:id')
  .put(update)
  .delete(remove);

module.exports = router;
