const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { authenticate } = require('../../middleware/authMiddleware');
const { isAdmin, requirePermission } = require('../../middleware/roleMiddleware');
const {
  getAllServices,
  getServiceById,
  createService,
  updateService,
  deleteService
} = require('../../controllers/adminControllers/serviceController');

const serviceValidation = [
  body('brandId').isMongoId().withMessage('Valid Brand ID is required'),
  body('title').notEmpty().withMessage('Title is required'),
  body('basePrice').isNumeric().withMessage('Base Price must be a number'),
  body('gstPercentage').isNumeric().withMessage('GST Percentage must be a number')
];

router.get('/services', authenticate, isAdmin, requirePermission('services'), getAllServices);
router.get('/services/:id', authenticate, isAdmin, requirePermission('services'), getServiceById);
router.post('/services', authenticate, isAdmin, requirePermission('services'), serviceValidation, createService);
router.put('/services/:id', authenticate, isAdmin, requirePermission('services'), updateService);
router.delete('/services/:id', authenticate, isAdmin, requirePermission('services'), deleteService);

module.exports = router;
