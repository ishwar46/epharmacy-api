const User = require('../models/User');

// @desc    Get current user's profile
// @route   GET /api/user/profile
// @access  Private
exports.getUserProfile = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.status(200).json({
            success: true,
            data: {
                _id: user._id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                address: user.address,
                profilePicture: user.profilePicture,
                role: user.role,
                isVerified: user.isVerified,
                emailVerified: user.emailVerified,
                lastLogin: user.lastLogin,
                createdAt: user.createdAt
            }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Update current user's profile
// @route   PUT /api/user/profile
// @access  Private
exports.updateUserProfile = async (req, res, next) => {
    try {
        const { name, phone, address, location } = req.body;

        // Find the user from req.user.id (set by protect middleware)
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Input validation
        if (name && name.trim().length < 2) {
            return res.status(400).json({
                success: false,
                message: 'Name must be at least 2 characters'
            });
        }

        if (phone && !/^\+?[\d\s\-\(\)]+$/.test(phone)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid phone number format'
            });
        }

        if (address && address.trim().length > 500) {
            return res.status(400).json({
                success: false,
                message: 'Address must be less than 500 characters'
            });
        }

        // Validate location coordinates
        if (location && location.lat && location.lng) {
            const lat = parseFloat(location.lat);
            const lng = parseFloat(location.lng);

            if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid coordinates. Latitude must be -90 to 90, longitude must be -180 to 180'
                });
            }
        }

        // Update fields if provided
        if (name) user.name = name.trim();
        if (phone !== undefined) user.phone = phone;
        if (address !== undefined) user.address = address.trim();

        // Update location if provided
        if (location && location.lat && location.lng) {
            const lat = parseFloat(location.lat);
            const lng = parseFloat(location.lng);
            user.location = { lat, lng };
        }

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
                location: user.location,
                profilePicture: user.profilePicture,
                role: user.role
            }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Delete user account
// @route   DELETE /api/user/account
// @access  Private
exports.deleteUserAccount = async (req, res, next) => {
    try {
        const { password } = req.body;

        if (!password) {
            return res.status(400).json({
                success: false,
                message: 'Please provide your password to confirm account deletion'
            });
        }

        // Get user with password
        const user = await User.findById(req.user.id).select('+password');

        // Verify password
        const isMatch = await user.matchPassword(password);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: 'Incorrect password'
            });
        }

        // Instead of hard delete, deactivate account
        user.status = 'inactive';
        user.email = `${user.email}_deleted_${Date.now()}`;
        await user.save();

        res.status(200).json({
            success: true,
            message: 'Account deactivated successfully'
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get user's order history
// @route   GET /api/user/orders
// @access  Private
exports.getUserOrders = async (req, res, next) => {
    try {
        const { page = 1, limit = 10, status } = req.query;

        // Build query
        const query = { user: req.user.id };
        if (status) {
            query.status = status;
        }

        // This will be implemented when we build the Order model
        // For now, return empty array
        res.status(200).json({
            success: true,
            message: 'Orders retrieved successfully',
            data: {
                orders: [],
                pagination: {
                    currentPage: parseInt(page),
                    totalPages: 0,
                    totalOrders: 0,
                    hasNext: false,
                    hasPrev: false
                }
            }
        });

        // TODO: Implement when Order model is ready
        // const Order = require('../models/Order');
        // const orders = await Order.find(query)
        //     .populate('items.product')
        //     .sort({ createdAt: -1 })
        //     .limit(limit * 1)
        //     .skip((page - 1) * limit)
        //     .exec();

        // const totalOrders = await Order.countDocuments(query);

        // res.status(200).json({
        //     success: true,
        //     data: {
        //         orders,
        //         pagination: {
        //             currentPage: parseInt(page),
        //             totalPages: Math.ceil(totalOrders / limit),
        //             totalOrders,
        //             hasNext: page * limit < totalOrders,
        //             hasPrev: page > 1
        //         }
        //     }
        // });
    } catch (error) {
        next(error);
    }
};

// @desc    Get user's addresses (if we implement multiple addresses later)
// @route   GET /api/user/addresses
// @access  Private
exports.getUserAddresses = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // For now, return main address
        const addresses = [];
        if (user.address) {
            addresses.push({
                _id: 'primary',
                type: 'primary',
                address: user.address,
                location: user.location,
                isDefault: true
            });
        }

        res.status(200).json({
            success: true,
            data: addresses
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Update user notification preferences
// @route   PUT /api/user/preferences
// @access  Private
exports.updateUserPreferences = async (req, res, next) => {
    try {
        const { emailNotifications, smsNotifications } = req.body;

        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // For now, just return success (can add preferences to User model later)
        res.status(200).json({
            success: true,
            message: 'Preferences updated successfully',
            data: {
                emailNotifications: emailNotifications || true,
                smsNotifications: smsNotifications || false
            }
        });
    } catch (error) {
        next(error);
    }
};