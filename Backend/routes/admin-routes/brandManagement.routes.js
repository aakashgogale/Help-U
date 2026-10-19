const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const { body } = require('express-validator');
const { authenticate } = require('../../middleware/authMiddleware');
const { isAdmin, requirePermission } = require('../../middleware/roleMiddleware');
const {
  getAllBrands,
  getBrandById,
  createBrand,
  updateBrand,
  deleteBrand,
  updateBrandPage,
  uploadBrandImage,
  getBrandDependencies,
  bulkReorderBrands,
  bulkBrandStatus,
  archiveBrand,
  restoreBrand
} = require('../../controllers/adminControllers/brandController');
const { uploadImage } = require('../../middleware/uploadMiddleware');

// Validation for new endpoints
const reorderValidation = [
  body('items').isArray({ min: 1 }).withMessage('items[] is required'),
  body('items.*.id').isMongoId().withMessage('Each item.id must be a valid Mongo id'),
  body('items.*.displayOrder').isInt({ min: 0 }).withMessage('Each item.displayOrder must be a non-negative integer')
];
const bulkStatusValidation = [
  body('ids').isArray({ min: 1 }).withMessage('ids[] is required'),
  body('ids.*').isMongoId().withMessage('Each id must be a valid Mongo id'),
  body('status').isIn(['active', 'inactive', 'deleted']).withMessage('status must be active, inactive or deleted')
];

// Validation rules
const createBrandValidation = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Brand title is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Title must be between 2 and 100 characters'),
  body('categoryId')
    .optional()
    .isMongoId()
    .withMessage('Invalid category ID'),
  body('categoryIds')
    .optional()
    .isArray({ min: 1 })
    .withMessage('At least one category is required')
    .custom((ids) => {
      if (ids && ids.some(id => !mongoose.Types.ObjectId.isValid(id))) {
        throw new Error('One or more category IDs are invalid');
      }
      return true;
    }),
  body('slug')
    .optional()
    .trim()
    .toLowerCase()
    .matches(/^[a-z0-9-]+$/)
    .withMessage('Slug must contain only lowercase letters, numbers, and hyphens'),
  body('basePrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Base price must be a non-negative number'),
  body('discountPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Discount price must be a non-negative number'),
  body('status')
    .optional()
    .isIn(['active', 'inactive', 'deleted'])
    .withMessage('Status must be active, inactive, or deleted'),
  body('displayOrder')
    .optional()
    .isInt({ min: 0 })
    .withMessage('displayOrder must be a non-negative integer'),
  body('bannerPromo')
    .optional()
    .isObject()
    .withMessage('bannerPromo must be an object')
];

const updateBrandValidation = [
  body('title')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Brand title cannot be empty')
    .isLength({ min: 2, max: 100 })
    .withMessage('Title must be between 2 and 100 characters'),
  body('categoryId')
    .optional()
    .isMongoId()
    .withMessage('Invalid category ID'),
  body('categoryIds')
    .optional()
    .isArray()
    .withMessage('Category IDs must be an array')
    .custom((ids) => {
      if (ids && ids.some(id => !mongoose.Types.ObjectId.isValid(id))) {
        throw new Error('One or more category IDs are invalid');
      }
      return true;
    }),
  body('slug')
    .optional()
    .trim()
    .toLowerCase()
    .matches(/^[a-z0-9-]+$/)
    .withMessage('Slug must contain only lowercase letters, numbers, and hyphens'),
  body('basePrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Base price must be a non-negative number'),
  body('discountPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Discount price must be a non-negative number'),
  body('status')
    .optional()
    .isIn(['active', 'inactive', 'deleted'])
    .withMessage('Status must be active, inactive, or deleted'),
  body('displayOrder')
    .optional()
    .isInt({ min: 0 })
    .withMessage('displayOrder must be a non-negative integer'),
  body('bannerPromo')
    .optional()
    .isObject()
    .withMessage('bannerPromo must be an object')
];

// Static / collection routes first so they don't collide with /brands/:id.
router.patch('/brands/reorder', authenticate, isAdmin, requirePermission('brands'), reorderValidation, bulkReorderBrands);
router.patch('/brands/bulk-status', authenticate, isAdmin, requirePermission('brands'), bulkStatusValidation, bulkBrandStatus);

// Routes
// GET /api/admin/brands - Get all brands
router.get('/brands', authenticate, isAdmin, requirePermission('brands'), getAllBrands);
router.get('/brands/:id/dependencies', authenticate, isAdmin, requirePermission('brands'), getBrandDependencies);

// GET /api/admin/brands/:id - Get single brand
router.get('/brands/:id', authenticate, isAdmin, requirePermission('brands'), getBrandById);

// POST /api/admin/brands - Create new brand
router.post('/brands', authenticate, isAdmin, requirePermission('brands'), createBrandValidation, createBrand);

// PUT /api/admin/brands/:id - Update brand
router.put('/brands/:id', authenticate, isAdmin, requirePermission('brands'), updateBrandValidation, updateBrand);

// DELETE /api/admin/brands/:id - Delete brand (soft delete)
router.delete('/brands/:id', authenticate, isAdmin, requirePermission('brands'), deleteBrand);

// Archive & Restore
router.post('/brands/:id/archive', authenticate, isAdmin, requirePermission('brands'), archiveBrand);
router.post('/brands/:id/restore', authenticate, isAdmin, requirePermission('brands'), restoreBrand);

// PATCH /api/admin/brands/:id/page - Update brand page content
router.patch('/brands/:id/page', authenticate, isAdmin, requirePermission('brands'), updateBrandPage);

// POST /api/admin/brands/upload-image - Upload brand image
router.post('/brands/upload-image', authenticate, isAdmin, requirePermission('brands'), uploadImage, uploadBrandImage);

module.exports = router;
