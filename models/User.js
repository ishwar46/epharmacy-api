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
        select: false
    },
    // Encrypted version of the plain password (for admin)
    plainPassword: {
        type: String,
        select: false
    },

    role: {
        type: String,
        enum: ['customer', 'admin', 'delivery'],
        default: 'customer'
    },

    phone: {
        type: String,
        default: '',
    },

    address: { type: String, default: '' },
    lat: { type: Number },
    lng: { type: Number },


    profilePicture: {
        type: String,
        default: '',
    },

    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Pre-save hook: encrypt plainPassword and hash password
UserSchema.pre('save', async function (next) {
    // Only run if the password is modified
    if (!this.isModified('password')) return next();

    try {
        // 1) Encrypt plain password
        this.plainPassword = encrypt(this.password);

        // 2) Hash for authentication
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
