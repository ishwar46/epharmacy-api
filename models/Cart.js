const mongoose = require('mongoose');

const CartItemSchema = new mongoose.Schema({
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
    },

    quantity: {
        type: Number,
        required: true,
        min: 1
    },

    purchaseType: {
        type: String,
        enum: ['unit', 'package'],
        required: true
    },

    pricePerItem: {
        type: Number,
        required: true
    },

    totalPrice: {
        type: Number,
        required: true
    },

    reservedStock: {
        type: Number,
        required: true
    },

    addedAt: {
        type: Date,
        default: Date.now
    }
});

const CartSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null,
        sparse: true
    },

    guestId: {
        type: String,
        default: null,
        sparse: true
    },

    items: [CartItemSchema],

    subtotal: {
        type: Number,
        default: 0
    },

    totalItems: {
        type: Number,
        default: 0
    },

    expiresAt: {
        type: Date,
        default: function () {
            return new Date(Date.now() + 30 * 60 * 1000);
        }
    },

    status: {
        type: String,
        enum: ['active', 'expired', 'converted_to_order'],
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

// Virtual to check if cart has expired
CartSchema.virtual('isExpired').get(function () {
    return this.expiresAt < new Date();
});

// Method to calculate cart totals
CartSchema.methods.calculateTotals = function () {
    this.subtotal = this.items.reduce((total, item) => total + item.totalPrice, 0);
    this.totalItems = this.items.reduce((total, item) => total + item.quantity, 0);
    this.updatedAt = new Date();
};

// Method to extend cart expiration
CartSchema.methods.extendExpiration = function () {
    this.expiresAt = new Date(Date.now() + 30 * 60 * 1000);
    this.updatedAt = new Date();
};

// Method to add item to cart
CartSchema.methods.addItem = async function (productId, quantity, purchaseType, pricePerItem) {
    const Product = mongoose.model('Product');
    const product = await Product.findById(productId);
    
    if (!product) {
        throw new Error('Product not found');
    }

    // Calculate stock needed based on purchase type
    let stockNeeded;
    if (purchaseType === 'unit' && (product.productType === 'tablet' || product.productType === 'capsule')) {
        stockNeeded = Math.ceil(quantity / (product.unitsPerStrip || 10));
    } else {
        stockNeeded = quantity;
    }

    const existingItemIndex = this.items.findIndex(
        item => (item.product._id || item.product).toString() === productId.toString() &&
            item.purchaseType === purchaseType
    );

    if (existingItemIndex > -1) {
        // Calculate new stock needed for the updated quantity
        const newTotalQuantity = this.items[existingItemIndex].quantity + quantity;
        let newStockNeeded;
        if (purchaseType === 'unit' && (product.productType === 'tablet' || product.productType === 'capsule')) {
            newStockNeeded = Math.ceil(newTotalQuantity / (product.unitsPerStrip || 10));
        } else {
            newStockNeeded = newTotalQuantity;
        }

        this.items[existingItemIndex].quantity = newTotalQuantity;
        this.items[existingItemIndex].totalPrice = newTotalQuantity * pricePerItem;
        this.items[existingItemIndex].reservedStock = newStockNeeded;
    } else {
        this.items.push({
            product: productId,
            quantity,
            purchaseType,
            pricePerItem,
            totalPrice: quantity * pricePerItem,
            reservedStock: stockNeeded
        });
    }

    this.calculateTotals();
    this.extendExpiration();
    return await this.save();
};

// Method to update item quantity
CartSchema.methods.updateItemQuantity = async function (productId, purchaseType, newQuantity) {
    const Product = mongoose.model('Product');
    const product = await Product.findById(productId);
    
    if (!product) {
        throw new Error('Product not found');
    }

    const itemIndex = this.items.findIndex(
        item => (item.product._id || item.product).toString() === productId.toString() &&
            item.purchaseType === purchaseType
    );

    if (itemIndex === -1) {
        throw new Error('Item not found in cart');
    }

    if (newQuantity <= 0) {
        this.items.splice(itemIndex, 1);
    } else {
        const item = this.items[itemIndex];
        
        // Calculate stock needed based on purchase type
        let stockNeeded;
        if (purchaseType === 'unit' && (product.productType === 'tablet' || product.productType === 'capsule')) {
            stockNeeded = Math.ceil(newQuantity / (product.unitsPerStrip || 10));
        } else {
            stockNeeded = newQuantity;
        }
        
        item.quantity = newQuantity;
        item.totalPrice = newQuantity * item.pricePerItem;
        item.reservedStock = stockNeeded;
    }

    this.calculateTotals();
    this.extendExpiration();
    return await this.save();
};

// Method to remove item from cart
CartSchema.methods.removeItem = async function (productId, purchaseType) {
    const itemIndex = this.items.findIndex(
        item => (item.product._id || item.product).toString() === productId.toString() &&
            item.purchaseType === purchaseType
    );

    if (itemIndex === -1) {
        throw new Error('Item not found in cart');
    }

    const removedItem = this.items[itemIndex];
    this.items.splice(itemIndex, 1);

    this.calculateTotals();
    return { cart: await this.save(), removedItem };
};

// Method to clear cart
CartSchema.methods.clearCart = async function () {
    const removedItems = [...this.items];
    this.items = [];
    this.calculateTotals();
    return { cart: await this.save(), removedItems };
};

// Static method to find cart by user or guest ID
CartSchema.statics.findActiveCart = function (userId = null, guestId = null) {
    const query = { status: 'active' };

    if (userId) {
        query.user = userId;
    } else if (guestId) {
        query.guestId = guestId;
        query.user = null;
    } else {
        return null;
    }

    return this.findOne(query).populate('items.product');
};

// Static method to cleanup expired carts
CartSchema.statics.cleanupExpiredCarts = async function () {
    const expiredCarts = await this.find({
        status: 'active',
        expiresAt: { $lt: new Date() }
    }).populate('items.product');

    const Product = mongoose.model('Product');

    for (const cart of expiredCarts) {
        for (const item of cart.items) {
            if (item.product && item.reservedStock > 0) {
                await item.product.releaseReservedStock(item.reservedStock);
            }
        }

        cart.status = 'expired';
        await cart.save();
    }

    return expiredCarts.length;
};

// Pre-save middleware
CartSchema.pre('save', function (next) {
    this.updatedAt = new Date();
    next();
});

// Indexes
CartSchema.index({ user: 1, status: 1 }, {
    sparse: true,
    partialFilterExpression: { user: { $exists: true, $ne: null } }
});
CartSchema.index({ guestId: 1, status: 1 }, {
    sparse: true,
    partialFilterExpression: { guestId: { $exists: true, $ne: null } }
});
CartSchema.index({ expiresAt: 1 });
CartSchema.index({ status: 1 });

module.exports = mongoose.model('Cart', CartSchema);