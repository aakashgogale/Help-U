const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middleware/authMiddleware');
const { isUser } = require('../../middleware/roleMiddleware');
const { validate, available } = require('../../controllers/userControllers/userCouponController');

router.use(authenticate, isUser);

router.post('/validate', validate);
router.get('/available', available);

module.exports = router;
