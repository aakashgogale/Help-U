const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middleware/authMiddleware');
const { isUser } = require('../../middleware/roleMiddleware');
const { listMyPlans, getMyPlan, updateMyPlan } = require('../../controllers/recurringBookingController');

router.use(authenticate, isUser);

router.get('/', listMyPlans);
router.get('/:id', getMyPlan);
router.post('/:id/pause', updateMyPlan('pause'));
router.post('/:id/resume', updateMyPlan('resume'));
router.post('/:id/cancel', updateMyPlan('cancel'));

module.exports = router;
