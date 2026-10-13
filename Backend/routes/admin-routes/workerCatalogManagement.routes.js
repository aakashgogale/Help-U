const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middleware/authMiddleware');
const { isAdmin, requirePermission } = require('../../middleware/roleMiddleware');
const {
  getAllWorkerServices,
  createWorkerService,
  updateWorkerService,
  deleteWorkerService,
  getAllWorkerParts,
  createWorkerPart,
  updateWorkerPart,
  deleteWorkerPart
} = require('../../controllers/adminControllers/workerCatalogController');

// Worker Service Routes
router.get('/worker-services', authenticate, isAdmin, requirePermission('worker-services'), getAllWorkerServices);
router.post('/worker-services', authenticate, isAdmin, requirePermission('worker-services'), createWorkerService);
router.put('/worker-services/:id', authenticate, isAdmin, requirePermission('worker-services'), updateWorkerService);
router.delete('/worker-services/:id', authenticate, isAdmin, requirePermission('worker-services'), deleteWorkerService);

// Worker Part Routes
router.get('/worker-parts', authenticate, isAdmin, requirePermission('worker-parts'), getAllWorkerParts);
router.post('/worker-parts', authenticate, isAdmin, requirePermission('worker-parts'), createWorkerPart);
router.put('/worker-parts/:id', authenticate, isAdmin, requirePermission('worker-parts'), updateWorkerPart);
router.delete('/worker-parts/:id', authenticate, isAdmin, requirePermission('worker-parts'), deleteWorkerPart);

module.exports = router;
