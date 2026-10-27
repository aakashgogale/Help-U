const express = require('express');
const router = express.Router();
const { optionalAuthenticate } = require('../../middleware/authMiddleware');
const { submitAppRequest } = require('../../controllers/supportRequestController');

router.post('/', optionalAuthenticate, submitAppRequest);

module.exports = router;
