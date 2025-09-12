const express = require('express');
const router = express.Router();
const { getUserProfile, updateUserProfile } = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');

// @desc    Routes for getting and updating a user's own profile
// @route   /api/users/profile
router.route('/profile').get(protect, getUserProfile).put(protect, updateUserProfile);

module.exports = router;