const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/authMiddleware');
const { isUser, isWorker, isAdmin } = require('../middleware/roleMiddleware');
const {
  createScrap,
  getMyScrap,
  getAvailableScrap,
  getMyAcceptedScrap,
  acceptScrap,
  respondToOffer,
  completeScrap,
  getAllScrapAdmin,
  getScrapById,
  deleteScrap
} = require('../controllers/scrapController');
const {
  listScrapTypes,
  adminListTypes,
  adminCreateType,
  adminUpdateType,
  adminDeleteType,
  adminTypeHistory
} = require('../controllers/scrapTypeController');

// User Routes
// What customers can sell. Declared before the '/:id' routes so 'types' is not read as an id.
router.get('/types', authenticate, isUser, listScrapTypes);
router.post('/', authenticate, isUser, createScrap);
router.get('/my', authenticate, isUser, getMyScrap);
router.put('/:id/respond', authenticate, isUser, respondToOffer);

// Admin Actions
router.put('/:id/accept', authenticate, isAdmin, acceptScrap);
router.put('/:id/offer', authenticate, isAdmin, acceptScrap);
router.put('/:id/complete', authenticate, isAdmin, completeScrap);
router.delete('/:id', authenticate, deleteScrap); // Allow delete (controller checks auth)
// Admin Routes
router.get('/all', authenticate, isAdmin, getAllScrapAdmin);
router.get('/admin/types', authenticate, isAdmin, adminListTypes);
router.post('/admin/types', authenticate, isAdmin, adminCreateType);
router.put('/admin/types/:id', authenticate, isAdmin, adminUpdateType);
router.delete('/admin/types/:id', authenticate, isAdmin, adminDeleteType);
router.get('/admin/types/:id/history', authenticate, isAdmin, adminTypeHistory);

// Shared/Specific ID Route
router.get('/:id', authenticate, getScrapById);

module.exports = router;
