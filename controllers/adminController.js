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

// @desc    Get all users (Admin-only)
// @route   GET /api/admin/users
// @access  Private/Admin
exports.getAllUsers = async (req, res, next) => {
    try {

        const users = await User.find({}, '-password -plainPassword');

        res.status(200).json({
            success: true,
            count: users.length,
            data: users
        });
    } catch (error) {
        next(error);
    }
};


// @desc    Create a new user (Admin-only)
// @route   POST /api/admin/users
// @access  Private/Admin
exports.createUserByAdmin = async (req, res, next) => {
    try {
        // name, email, password, role, phone, address come from req.body
        const { name, email, password, role, phone, address } = req.body;

        // Check if user with that email already exists
        const existing = await User.findOne({ email });
        if (existing) {
            return res.status(400).json({
                success: false,
                message: 'User already exists'
            });
        }

        // Create new user
        const newUser = new User({
            name,
            email,
            password,
            role: role || 'customer',
            phone: phone || '',
            address: address || ''
        });

        // Because we handle hashing in the pre('save'), just call save()
        await newUser.save();

        res.status(201).json({
            success: true,
            message: 'User created successfully',
            data: {
                _id: newUser._id,
                name: newUser.name,
                email: newUser.email,
                role: newUser.role,
                phone: newUser.phone,
                address: newUser.address
            }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Update an existing user (Admin-only)
// @route   PUT /api/admin/users/:userId
// @access  Private/Admin
exports.updateUserByAdmin = async (req, res, next) => {
    try {
        const { userId } = req.params;
        const { name, email, password, role, phone, address } = req.body;

        // Find the user
        const user = await User.findById(userId).select('+plainPassword');
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // Update fields if provided
        if (name !== undefined) user.name = name;
        if (email !== undefined) user.email = email;
        if (role !== undefined) user.role = role;
        if (phone !== undefined) user.phone = phone;
        if (address !== undefined) user.address = address;

        // If admin wants to change password
        if (password) {
            // Re-encrypt plain password
            user.plainPassword = encrypt(password);

            // Re-hash new password
            const salt = await bcrypt.genSalt(10);
            user.password = await bcrypt.hash(password, salt);
        }

        await user.save();

        res.status(200).json({
            success: true,
            message: 'User updated successfully',
            data: {
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                phone: user.phone,
                address: user.address
            }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Delete a user (Admin-only)
// @route   DELETE /api/admin/users/:userId
// @access  Private/Admin
exports.deleteUserByAdmin = async (req, res, next) => {
    try {
        const { userId } = req.params;

        const user = await User.findByIdAndDelete(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        res.status(200).json({
            success: true,
            message: 'User deleted successfully'
        });
    } catch (error) {
        next(error);
    }
};