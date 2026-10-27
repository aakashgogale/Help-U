const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middleware/authMiddleware');
const { isAdmin, requirePermission } = require('../../middleware/roleMiddleware');
const { listSupportMessages, updateSupportMessage } = require('../../controllers/supportMessageController');

// Scoped to '/support-messages': this router shares the '/api/admin' mount point with many others
router.use('/support-messages', authenticate, isAdmin, requirePermission('content'));
router.get('/support-messages', listSupportMessages);
router.put('/support-messages/:id', updateSupportMessage);

module.exports = router;
