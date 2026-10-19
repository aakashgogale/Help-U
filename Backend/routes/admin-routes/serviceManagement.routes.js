const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { authenticate } = require('../../middleware/authMiddleware');
const { isAdmin, requirePermission } = require('../../middleware/roleMiddleware');
const {
  getAllServices,
  getServiceById,
  getServiceDependencies,
  createService,
  updateService,
  deleteService,
  duplicateService,
  bulkServiceStatus,
  archiveService,
  restoreService,
  bulkMoveServices,
  listServicesWithStats,
  getCatalogHealth
} = require('../../controllers/adminControllers/serviceController');

const serviceValidation = [
  body('brandId').isMongoId().withMessage('Valid Brand ID is required'),
  body('title').notEmpty().withMessage('Title is required'),
  body('basePrice').isNumeric().withMessage('Base Price must be a number'),
  body('gstPercentage').isNumeric().withMessage('GST Percentage must be a number'),
  // Phase-1 variant guard: variants must be an array when present. Content
  // validation happens inside the controller (normaliseVariants).
  body('variants').optional({ nullable: true }).isArray().withMessage('variants must be an array'),
  body('originalPrice').optional({ nullable: true }).isFloat({ min: 0 }).withMessage('originalPrice must be >= 0'),
  body('durationMinutes').optional({ nullable: true }).isInt({ min: 0 }).withMessage('durationMinutes must be a non-negative integer'),
  body('categoryId').optional({ nullable: true, checkFalsy: true }).isMongoId().withMessage('categoryId must be a valid Mongo id'),
  body('cityIds').optional({ nullable: true }).isArray().withMessage('cityIds must be an array'),
  body('images').optional().isArray().withMessage('images must be an array of urls')
];

const bulkStatusValidation = [
  body('ids').isArray({ min: 1 }).withMessage('ids[] is required'),
  body('ids.*').isMongoId().withMessage('Each id must be a valid Mongo id'),
  body('status').isIn(['active', 'inactive', 'deleted']).withMessage('status must be active, inactive or deleted')
];

const bulkMoveValidation = [
  body('ids').isArray({ min: 1 }).withMessage('ids[] is required'),
  body('ids.*').isMongoId().withMessage('Each id must be a valid Mongo id'),
  body('brandId').isMongoId().withMessage('brandId must be a valid Mongo id'),
  body('categoryId').optional({ nullable: true, checkFalsy: true }).isMongoId().withMessage('categoryId must be a valid Mongo id')
];

// Static / collection routes first to avoid collisions with /services/:id.
router.get('/catalog/health', authenticate, isAdmin, getCatalogHealth);
router.get('/services/with-stats', authenticate, isAdmin, requirePermission('services'), listServicesWithStats);
router.patch('/services/bulk-status', authenticate, isAdmin, requirePermission('services'), bulkStatusValidation, bulkServiceStatus);
router.patch('/services/bulk-move', authenticate, isAdmin, requirePermission('services'), bulkMoveValidation, bulkMoveServices);

// Per-id helpers and standard CRUD.
router.get('/services', authenticate, isAdmin, requirePermission('services'), getAllServices);
router.get('/services/:id', authenticate, isAdmin, requirePermission('services'), getServiceById);
router.get('/services/:id/dependencies', authenticate, isAdmin, requirePermission('services'), getServiceDependencies);
router.post('/services', authenticate, isAdmin, requirePermission('services'), serviceValidation, createService);
router.post('/services/:id/duplicate', authenticate, isAdmin, requirePermission('services'), duplicateService);
router.post('/services/:id/archive', authenticate, isAdmin, requirePermission('services'), archiveService);
router.post('/services/:id/restore', authenticate, isAdmin, requirePermission('services'), restoreService);
router.put('/services/:id', authenticate, isAdmin, requirePermission('services'), updateService);
router.delete('/services/:id', authenticate, isAdmin, requirePermission('services'), deleteService);

module.exports = router;
