// controllers/adminController.js
const User = require('../models/User');
const { decrypt } = require('../utils/crypto');

// @desc    Get decrypted plain password for a user (Admin-only route)
// @route   GET /api/admin/user-plain-password/:userId
// @access  Private/Admin
exports.getUserPlainPassword = async (req, res, next) => {
    try {
        // Retrieve the user including the encrypted plainPassword field
        const user = await User.findById(req.params.userId).select('+plainPassword');
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        // Decrypt the plain password for admin use
        const decryptedPassword = decrypt(user.plainPassword);
        res.status(200).json({ success: true, data: { plainPassword: decryptedPassword } });
    } catch (error) {
        next(error);
    }
};
