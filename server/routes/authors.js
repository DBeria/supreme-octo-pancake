const express = require('express');
const router = express.Router();
const { getOrCreateMyProfile, getAuthorById, updateMyProfile, uploadPhoto, uploadCV, getAuthorByUserId} = require('../controllers/authorController');
const { protect } = require('../middleware/authMiddleware');
const { admin } = require('../middleware/adminMiddleware');

// Routes for an admin to manage their own profile
router.route('/my-profile')
    .get(protect, admin, getOrCreateMyProfile)
    .put(protect, admin, updateMyProfile);

// Public route to get any author's profile
router.route('/:id').get(getAuthorById);

// Public: get author by USER id
router.get('/by-user/:userId', getAuthorByUserId);

module.exports = router;


const { photoUpload, cvUpload } = require('../middleware/upload');

// Dedicated upload endpoints with per-file limits
router.put('/my-profile/photo', protect, admin, photoUpload.single('photo'), uploadPhoto);
router.put('/my-profile/cv', protect, admin, cvUpload.single('cv'), uploadCV);
