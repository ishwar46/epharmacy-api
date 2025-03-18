// routes/admin.js
const express = require('express');
const router = express.Router();
const {
    getUserPlainPassword,
    getAllUsers,
    createUserByAdmin,
    updateUserByAdmin,
    deleteUserByAdmin
} = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/auth');

// Decrypt plain password for a given user
router.get('/user-plain-password/:userId', protect, authorize('admin'), getUserPlainPassword);

// Get all users
router.get('/users', protect, authorize('admin'), getAllUsers);

// Create user by admin
router.post('/users', protect, authorize('admin'), createUserByAdmin);

// Update user by admin
router.put('/users/:userId', protect, authorize('admin'), updateUserByAdmin);

// Delete user by admin
router.delete('/users/:userId', protect, authorize('admin'), deleteUserByAdmin);

module.exports = router;
