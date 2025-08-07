const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please add a name'],
        trim: true
    },
    email: {
        type: String,
        required: [true, 'Please add an email'],
        unique: true,
        lowercase: true,
        trim: true,
        match: [
            /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
            'Please add a valid email'
        ]
    },
    password: {
        type: String,
        required: [true, 'Please add a password'],
        minlength: 6,
        select: false
    },

    role: {
        type: String,
        enum: ['customer', 'admin', 'delivery', 'pharmacist'],
        default: 'customer'
    },

    phone: {
        type: String,
        default: '',
    },

    // Enhanced address structure
    address: {
        type: String,
        default: ''
    },
    location: {
        lat: { type: Number },
        lng: { type: Number }
    },

    profilePicture: {
        type: String,
        default: '',
    },

    // Account status and verification
    status: {
        type: String,
        enum: ['active', 'inactive', 'suspended'],
        default: 'active'
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    emailVerified: {
        type: Boolean,
        default: false
    },

    // Security fields
    loginAttempts: {
        type: Number,
        default: 0
    },
    lockUntil: Date,

    // Password reset
    resetPasswordToken: String,
    resetPasswordExpiry: Date,

    // Email verification
    emailVerificationToken: String,
    emailVerificationExpiry: Date,

    // Login tracking
    lastLogin: Date,

    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true,
    toJSON: {
        virtuals: true,
        transform: function (doc, ret) {
            delete ret.password;
            delete ret.resetPasswordToken;
            delete ret.emailVerificationToken;
            return ret;
        }
    }
});

// Virtual for checking if account is locked
UserSchema.virtual('isAccountLocked').get(function () {
    return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Indexes
UserSchema.index({ role: 1 });
UserSchema.index({ status: 1 });

// Pre-save middleware to hash password
UserSchema.pre('save', async function (next) {
    // Only hash the password if it has been modified (or is new)
    if (!this.isModified('password')) return next();

    try {
        const salt = await bcrypt.genSalt(12); // Increased salt rounds for better security
        this.password = await bcrypt.hash(this.password, salt);
        this.updatedAt = Date.now();
        next();
    } catch (error) {
        next(error);
    }
});

// Instance method to check password
UserSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

// Method to handle failed login attempts
UserSchema.methods.incrementLoginAttempts = function () {
    // If we have a previous lock that has expired, restart at 1
    if (this.lockUntil && this.lockUntil < Date.now()) {
        return this.updateOne({
            $unset: { lockUntil: 1 },
            $set: { loginAttempts: 1 }
        });
    }

    const updates = { $inc: { loginAttempts: 1 } };

    // Lock account after 5 failed attempts for 2 hours
    if (this.loginAttempts + 1 >= 5 && !this.isAccountLocked) {
        updates.$set = { lockUntil: Date.now() + 2 * 60 * 60 * 1000 }; // 2 hours
    }

    return this.updateOne(updates);
};

// Method to reset login attempts
UserSchema.methods.resetLoginAttempts = function () {
    return this.updateOne({
        $unset: { loginAttempts: 1, lockUntil: 1 }
    });
};

// Generate password reset token
UserSchema.methods.generatePasswordResetToken = function () {
    const crypto = require('crypto');
    const resetToken = crypto.randomBytes(20).toString('hex');

    this.resetPasswordToken = crypto
        .createHash('sha256')
        .update(resetToken)
        .digest('hex');

    this.resetPasswordExpiry = Date.now() + 10 * 60 * 1000; // 10 minutes

    return resetToken;
};

// Generate email verification token
UserSchema.methods.generateEmailVerificationToken = function () {
    const crypto = require('crypto');
    const verificationToken = crypto.randomBytes(20).toString('hex');

    this.emailVerificationToken = crypto
        .createHash('sha256')
        .update(verificationToken)
        .digest('hex');

    this.emailVerificationExpiry = Date.now() + 24 * 60 * 60 * 1000; // 24 hours

    return verificationToken;
};

// Static method to find by email
UserSchema.statics.findByEmail = function (email) {
    return this.findOne({ email: email.toLowerCase() });
};

module.exports = mongoose.model('User', UserSchema);