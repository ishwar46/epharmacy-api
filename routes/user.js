// routes/user.js
const express = require('express');
const router = express.Router();

const { protect } = require('../middleware/auth');
const { updateUserProfile } = require('../controllers/userController');

// Multer config for user profile
const uploadUserProfile = require("../utils/uploadUserProfile");

// Protect the route (only logged-in users can update themselves)
router.put('/profile', protect, uploadUserProfile.single('profilePicture'), updateUserProfile);

module.exports = router;
