const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middleware/authMiddleware');
const { isAdmin, requirePermission } = require('../../middleware/roleMiddleware');
const { getAllLegalPages, getLegalPage, updateLegalPage } = require('../../controllers/adminControllers/legalPageController');

// Scoped to '/legal-pages': this router shares the '/api/admin' mount point
// with many other route files, and a path-less router.use(middleware) runs
// for every request reaching the router, not just the ones this file
// actually handles — see cityManagement.routes.js for the full story.
router.use('/legal-pages', authenticate, isAdmin, requirePermission('content'));

router.get('/legal-pages', getAllLegalPages);
router.get('/legal-pages/:slug', getLegalPage);
router.put('/legal-pages/:slug', updateLegalPage);

module.exports = router;
