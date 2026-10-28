const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middleware/authMiddleware');
const { isAdmin, requirePermission } = require('../../middleware/roleMiddleware');
const {
  getAdminFields,
  createField,
  updateField,
  toggleField,
  deleteField,
  seedDefaultFields
} = require('../../controllers/adminControllers/partnerFieldController');

// Allow admins who have 'workers' permission (or super admin)
router.use('/partner-registration-fields', authenticate, isAdmin, requirePermission('workers'));

router.get('/partner-registration-fields', getAdminFields);
router.post('/partner-registration-fields', createField);
router.post('/partner-registration-fields/seed-defaults', seedDefaultFields);
router.put('/partner-registration-fields/:id', updateField);
router.patch('/partner-registration-fields/:id/toggle', toggleField);
router.delete('/partner-registration-fields/:id', deleteField);

module.exports = router;
