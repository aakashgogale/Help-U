const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middleware/authMiddleware');
const { uploadImage } = require('../../middleware/uploadMiddleware');
const { getSignature } = require('../../controllers/cloudinaryController');

// This router is mounted at both /api/admin and bare /api, and is used by
// every logged-in role (admin catalog images, user scrap photos, worker
// profile photos) — so it only requires a valid login, not a specific role.
// Without `authenticate`, anyone on the internet could mint signed Cloudinary
// upload credentials or upload files with no account at all.
router.get('/upload/sign-signature', authenticate, getSignature);

// Upload single file to Cloudinary
router.post('/upload', authenticate, uploadImage, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    // When using multer-storage-cloudinary, req.file.path is the secure_url
    res.status(200).json({
      success: true,
      imageUrl: req.file.path,
      message: 'File uploaded successfully'
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload file',
      error: error.message
    });
  }
});

module.exports = router;
