const express = require('express');
const router = express.Router();
const { getOrCreateMyProfile, getAuthorById, updateMyProfile } = require('../controllers/authorController');
const { protect } = require('../middleware/authMiddleware');
const { admin } = require('../middleware/adminMiddleware');

// Routes for an admin to manage their own profile
router.route('/my-profile')
    .get(protect, admin, getOrCreateMyProfile)
    .put(protect, admin, updateMyProfile);

// Public route to get any author's profile
router.route('/:id').get(getAuthorById);

module.exports = router;
