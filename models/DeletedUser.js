const mongoose = require('mongoose');

const DeletedUserSchema = new mongoose.Schema({
    // Original user data
    originalUserId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    userData: {
        name: String,
        email: String,
        phone: String,
        address: String,
        location: {
            lat: Number,
            lng: Number
        },
        role: String,
        profilePicture: String,
        isVerified: Boolean,
        emailVerified: Boolean,
        lastLogin: Date,
        createdAt: Date
    },

    // Deletion metadata
    deletedAt: {
        type: Date,
        default: Date.now
    },
    deletedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', // Could be self-deletion or admin deletion
        required: true
    },
    deletionReason: {
        type: String,
        enum: [
            'self_request', 
            'admin_action', 
            'policy_violation', 
            'inactive_account', 
            'duplicate_account',
            'technical_issues',
            'privacy_concerns',
            'no_longer_needed',
            'switching_platform',
            'dissatisfied_service',
            'other'
        ],
        default: 'self_request'
    },
    deletionNotes: String,

    // Related data summary
    relatedData: {
        totalOrders: {
            type: Number,
            default: 0
        },
        totalSpent: {
            type: Number,
            default: 0
        },
        lastOrderDate: Date,
        hadActiveOrders: {
            type: Boolean,
            default: false
        }
    },

    // Legal/compliance
    dataRetentionExpiry: {
        type: Date,
        default: function () {
            // Keep for 7 years for legal compliance
            return new Date(Date.now() + 7 * 365 * 24 * 60 * 60 * 1000);
        }
    },
    canBeRestored: {
        type: Boolean,
        default: true
    },
    restoredAt: Date,
    restoredBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
});

// Indexes
DeletedUserSchema.index({ originalUserId: 1 });
DeletedUserSchema.index({ deletedAt: 1 });
DeletedUserSchema.index({ dataRetentionExpiry: 1 });

module.exports = mongoose.model('DeletedUser', DeletedUserSchema);