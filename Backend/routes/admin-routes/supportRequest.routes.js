const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middleware/authMiddleware');
const { isAdmin } = require('../../middleware/roleMiddleware');
const { adminList, adminUpdate } = require('../../controllers/supportRequestController');

router.get('/support-requests', authenticate, isAdmin, adminList);
router.put('/support-requests/:id', authenticate, isAdmin, adminUpdate);

module.exports = router;
