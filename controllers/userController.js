const User = require('../models/User');

// @desc    Update current user's profile
// @route   PUT /api/user/profile
// @access  Private
exports.updateUserProfile = async (req, res, next) => {
    try {
        const { phone, address } = req.body;

        // Find the user from req.user.id (set by protect middleware)
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // Update phone/address if provided
        if (phone) user.phone = phone;
        if (address) user.address = address;

        // If a new profile picture was uploaded (req.file)
        if (req.file) {
            user.profilePicture = `/uploads/userProfiles/${req.file.filename}`;
        }

        // Save changes
        await user.save();

        res.status(200).json({
            success: true,
            message: 'Profile updated successfully',
            data: {
                _id: user._id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                address: user.address,
                profilePicture: user.profilePicture,
                role: user.role
            }
        });
    } catch (error) {
        next(error);
    }
};
