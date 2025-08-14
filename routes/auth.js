const express = require('express');
const router = express.Router();

const {
    register,
    login,
    getMe,
    logout,
    updateDetails,
    updatePassword,
    forgotPassword,
    resetPassword
} = require('../controllers/authController');

const { protect } = require('../middleware/auth');

// Public routes
router.post('/register', register);
router.post('/login', login);
router.post('/forgotpassword', forgotPassword);
router.put('/resetpassword/:resettoken', resetPassword);

// Protected routes (require authentication)
router.get('/me', protect, getMe);
router.post('/logout', protect, logout);
router.put('/updatedetails', protect, updateDetails);
router.put('/updatepassword', protect, updatePassword);

module.exports = router;