const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middleware/authMiddleware');
const { uploadImage } = require('../../middleware/uploadMiddleware');

// Used by every logged-in role (profile photo uploads, catalog images) — any
// valid login is enough; no auth here would let anyone upload for free.
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
