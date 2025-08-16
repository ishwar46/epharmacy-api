const mongoose = require('mongoose');
const { PRODUCT_CATEGORIES, MEDICINE_TYPES, PRODUCT_TYPES } = require('../constants/categories');

const ProductSchema = new mongoose.Schema({
    // Basic Information
    name: {
        type: String,
        required: [true, 'Please add a product name'],
        trim: true
    },
    description: {
        type: String,
        required: [true, 'Please add a product description'],
        trim: true
    },
    brand: {
        type: String,
        required: [true, 'Please specify the product brand'],
        trim: true
    },
    category: {
        type: String,
        enum: PRODUCT_CATEGORIES,
        required: [true, 'Please specify a valid category']
    },

    // Medicine Type - Simple
    medicineType: {
        type: String,
        enum: MEDICINE_TYPES,
        required: [true, 'Please specify medicine type']
    },

    // Simplified Packaging - Only for tablets/capsules that can be sold individually
    productType: {
        type: String,
        enum: PRODUCT_TYPES,
        required: [true, 'Please specify product type']
    },

    // Only for tablets/capsules - units per strip
    unitsPerStrip: {
        type: Number,
        default: function () {
            return ['tablet', 'capsule'].includes(this.productType) ? 10 : 1;
        }
    },

    // Can this product be sold per unit? (only for tablets/capsules)
    allowUnitSale: {
        type: Boolean,
        default: function () {
            return ['tablet', 'capsule'].includes(this.productType);
        }
    },

    // Simple Pricing
    price: {
        type: Number,
        required: [true, 'Please add a price']
    },

    // Price unit - per tablet, per strip, per bottle, etc.
    priceUnit: {
        type: String,
        default: function () {
            if (['tablet', 'capsule'].includes(this.productType)) {
                return 'per strip';
            }
            return 'per unit';
        }
    },

    // Simple Stock Management
    stock: {
        type: Number,
        required: [true, 'Please add stock quantity'],
        min: 0
    },

    // Reserved stock for pending orders
    reservedStock: {
        type: Number,
        default: 0,
        min: 0
    },

    // Minimum purchase quantities
    minOrderQuantity: {
        type: Number,
        default: 1,
        min: 1
    },

    // Maximum purchase quantities (optional)
    maxOrderQuantity: {
        type: Number,
        default: null
    },

    // Stock unit - strips, bottles, pieces, etc.
    stockUnit: {
        type: String,
        default: function () {
            if (['tablet', 'capsule'].includes(this.productType)) {
                return 'strips';
            } else if (this.productType === 'syrup') {
                return 'bottles';
            }
            return 'units';
        }
    },

    // Optional fields
    manufacturer: String,
    activeIngredient: String,
    dosage: String, // Simple string like "500mg"

    // Images
    images: {
        type: [String],
        default: []
    },

    // Product status
    status: {
        type: String,
        enum: ['active', 'inactive', 'discontinued'],
        default: 'active'
    },

    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Virtual for available stock
ProductSchema.virtual('availableStock').get(function () {
    return Math.max(0, this.stock - this.reservedStock);
});

// Virtual for available tablets/capsules (for unit sales)
ProductSchema.virtual('availableUnits').get(function () {
    if (['tablet', 'capsule'].includes(this.productType)) {
        return this.availableStock * this.unitsPerStrip;
    }
    return this.availableStock;
});

// Virtual for stock status
ProductSchema.virtual('stockStatus').get(function () {
    const available = this.availableStock;
    if (available === 0) return 'out_of_stock';
    if (available <= 5) return 'low_stock'; // Simple low stock threshold
    return 'in_stock';
});

// Method to reserve stock
ProductSchema.methods.reserveStock = async function (quantity) {
    if (this.availableStock < quantity) {
        throw new Error('Insufficient stock available');
    }
    this.reservedStock += quantity;
    await this.save();
    return this;
};

// Method to release reserved stock
ProductSchema.methods.releaseReservedStock = async function (quantity) {
    this.reservedStock = Math.max(0, this.reservedStock - quantity);
    await this.save();
    return this;
};

// Method to deduct stock after successful order
ProductSchema.methods.deductStock = async function (quantity) {
    if (this.reservedStock < quantity) {
        throw new Error('Insufficient reserved stock');
    }
    this.stock -= quantity;
    this.reservedStock -= quantity;
    await this.save();
    return this;
};

// Pre-save middleware
ProductSchema.pre('save', function (next) {
    this.updatedAt = Date.now();

    // Ensure reserved stock doesn't exceed total stock
    if (this.reservedStock > this.stock) {
        this.reservedStock = this.stock;
    }

    next();
});

// Indexes for better performance
ProductSchema.index({ name: 'text', description: 'text' });
ProductSchema.index({ category: 1 });
ProductSchema.index({ medicineType: 1 });
ProductSchema.index({ status: 1 });
ProductSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Product', ProductSchema);