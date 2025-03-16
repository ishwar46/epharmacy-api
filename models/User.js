const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const { encrypt } = require('../utils/crypto');

const UserSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please add a name'],
    },
    email: {
        type: String,
        required: [true, 'Please add an email'],
        unique: true,
        match: [
            /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
            'Please add a valid email'
        ]
    },
    password: {
        type: String,
        required: [true, 'Please add a password'],
        minlength: 6,
        select: false // Hides password field by default
    },
    // New field to store the encrypted plain password for admin use
    plainPassword: {
        type: String,
        required: [false, 'Plain password is required'],
        select: false // Not returned by default in queries
    },
    role: {
        type: String,
        enum: ['customer', 'admin', 'pharmacist'],
        default: 'customer'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Hash password before saving and encrypt the plain password for admin access
UserSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    try {
        // Encrypt and store the plain password (for admin purposes only)
        this.plainPassword = encrypt(this.password);

        // Hash the password for authentication
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// Compare entered password with hashed password
UserSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', UserSchema);
