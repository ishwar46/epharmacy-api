const express = require('express');
const router = express.Router();

const { protect } = require('../middleware/auth');
const {
    getUserProfile,
    updateUserProfile,
    deleteUserAccount,
    getUserOrders,
    getUserAddresses,
    updateUserPreferences
} = require('../controllers/userController');

// Multer config for user profile pictures
const uploadUserProfile = require("../utils/uploadUserProfile");

// All user routes are protected (require authentication)
router.use(protect);

// Profile routes
router.get('/profile', getUserProfile);
router.put('/profile', uploadUserProfile.single('profilePicture'), updateUserProfile);

// Account management
router.delete('/account', deleteUserAccount);

// Orders (will be fully implemented when Order model is ready)
router.get('/orders', getUserOrders);

// Addresses
router.get('/addresses', getUserAddresses);

// Preferences
router.put('/preferences', updateUserPreferences);

module.exports = router;