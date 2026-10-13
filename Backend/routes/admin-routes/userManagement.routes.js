const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { authenticate } = require('../../middleware/authMiddleware');
const { isAdmin, requirePermission } = require('../../middleware/roleMiddleware');
const {
  getAllUsers,
  getUserDetails,
  toggleUserStatus,
  deleteUser,
  getUserBookings,
  getUserWalletTransactions,
  adjustUserWallet,
  getAllUserBookings
} = require('../../controllers/adminControllers/adminUserController');

// Validation rules
const toggleStatusValidation = [
  body('isActive').isBoolean().withMessage('isActive must be a boolean')
];

// Routes — gated on the 'users' permission so a scoped admin role (or a
// sub-admin not granted 'users') cannot read or edit customer data just
// because they can reach the admin panel at all.
router.get('/users', authenticate, isAdmin, requirePermission('users'), getAllUsers);
router.get('/users/bookings', authenticate, isAdmin, requirePermission('users'), getAllUserBookings);
router.get('/users/:id', authenticate, isAdmin, requirePermission('users'), getUserDetails);
router.put('/users/:id/status', authenticate, isAdmin, requirePermission('users'), toggleStatusValidation, toggleUserStatus);
router.delete('/users/:id', authenticate, isAdmin, requirePermission('users'), deleteUser);
router.get('/users/:id/bookings', authenticate, isAdmin, requirePermission('users'), getUserBookings);
router.get('/users/:id/wallet', authenticate, isAdmin, requirePermission('users'), getUserWalletTransactions);
router.post('/users/:id/wallet-adjust', authenticate, isAdmin, requirePermission('users'), adjustUserWallet);

module.exports = router;

