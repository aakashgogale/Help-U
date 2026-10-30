const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { authenticate } = require('../../middleware/authMiddleware');
const { isWorker } = require('../../middleware/roleMiddleware');
const { getProfile, updateProfile, updateAddress, updateLocation, updateStatus } = require('../../controllers/workerControllers/workerProfileController');
const { listAddresses, addAddress, updateSavedAddress, activateAddress, deleteAddress } = require('../../controllers/workerControllers/workerAddressController');

// Validation rules
const updateProfileValidation = [
  body('name').optional().trim().isLength({ min: 2, max: 50 }).withMessage('Name must be between 2 and 50 characters'),
  body('businessName').optional().trim().isLength({ max: 100 }).withMessage('Business name must be less than 100 characters'),
  body('alternatePhone').optional({ checkFalsy: true }).trim().matches(/^\+?[0-9]{10,13}$/).withMessage('Invalid alternate phone number')
];

const updateAddressValidation = [
  body('fullAddress').notEmpty().trim().withMessage('Full address is required'),
  body('lat').notEmpty().isFloat().withMessage('Valid latitude is required'),
  body('lng').notEmpty().isFloat().withMessage('Valid longitude is required')
];

// Saved addresses: one of them is the base location jobs are matched on
const savedAddressValidation = [
  body('fullAddress').notEmpty().trim().withMessage('Full address is required'),
  body('lat').notEmpty().isFloat({ min: -90, max: 90 }).withMessage('Pin the location on the map'),
  body('lng').notEmpty().isFloat({ min: -180, max: 180 }).withMessage('Pin the location on the map')
];

// Routes
router.get('/profile', authenticate, isWorker, getProfile);
router.put('/profile', authenticate, isWorker, updateProfileValidation, updateProfile);
router.put('/address', authenticate, isWorker, updateAddressValidation, updateAddress);
router.get('/addresses', authenticate, isWorker, listAddresses);
router.post('/addresses', authenticate, isWorker, savedAddressValidation, addAddress);
router.put('/addresses/:id', authenticate, isWorker, savedAddressValidation, updateSavedAddress);
router.put('/addresses/:id/activate', authenticate, isWorker, activateAddress);
router.delete('/addresses/:id', authenticate, isWorker, deleteAddress);
router.put('/profile/location', authenticate, isWorker, updateLocation);
router.put('/status', authenticate, isWorker, updateStatus);

module.exports = router;


