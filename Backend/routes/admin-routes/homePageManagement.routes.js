const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middleware/authMiddleware');
const { isAdmin, requirePermission } = require('../../middleware/roleMiddleware');
const { getHomeContent, updateHomeContent } = require('../../controllers/adminControllers/homeContentController');

// Get home content
router.get('/home-content', authenticate, isAdmin, requirePermission('content'), getHomeContent);

// Update home content
router.put('/home-content', authenticate, isAdmin, requirePermission('content'), updateHomeContent);

module.exports = router;

