const mongoose = require('mongoose');

// Prescription Schema for handling prescription uploads
const PrescriptionSchema = new mongoose.Schema({
    imageUrl: {
        type: String,
        required: true
    },
    fileName: {
        type: String,
        required: true
    },
    doctorName: {
        type: String,
        required: true
    },
    hospitalName: {
        type: String
    },
    prescriptionDate: {
        type: Date,
        required: true
    },
    verified: {
        type: Boolean,
        default: false
    },
    verifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User' // Pharmacist who verified
    },
    verifiedAt: {
        type: Date
    },
    verificationNotes: {
        type: String
    },
    rejectionReason: {
        type: String
    }
});

// Order Item Schema
const OrderItemSchema = new mongoose.Schema({
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
    },
    // Store product snapshot at time of order
    productSnapshot: {
        name: String,
        brand: String,
        category: String,
        medicineType: String,
        productType: String,
        price: Number,
        image: String
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
    prescriptionRequired: {
        type: Boolean,
        default: false
    }
});

// Main Order Schema
const OrderSchema = new mongoose.Schema({
    // Order Identification - REMOVED required: true to let pre-save generate it
    orderNumber: {
        type: String
        // removed required: true - will be generated in pre-save
        // unique index is defined explicitly below in schema.index()
    },

    // Customer Information - supports both registered users and guests
    customer: {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null
        },
        // Guest customer details - simplified without conditional validation
        guestDetails: {
            name: {
                type: String,
                default: null
            },
            email: {
                type: String,
                default: null
            },
            phone: {
                type: String,
                default: null
            }
        },
        isGuest: {
            type: Boolean,
            default: false
        }
    },

    // Order Items
    items: [OrderItemSchema],

    // Prescription Information
    prescriptions: [PrescriptionSchema],
    hasPrescriptionItems: {
        type: Boolean,
        default: false
    },
    prescriptionStatus: {
        type: String,
        enum: ['not_required', 'pending_verification', 'verified', 'rejected'],
        default: 'not_required'
    },

    // Delivery Address
    deliveryAddress: {
        name: {
            type: String,
            required: true
        },
        phone: {
            type: String,
            required: true
        },
        street: {
            type: String,
            required: true
        },
        area: {
            type: String,
            required: true
        },
        city: {
            type: String,
            required: true,
            default: 'Kathmandu'
        },
        landmark: {
            type: String
        },
        deliveryInstructions: {
            type: String
        }
    },

    // Order Totals
    pricing: {
        subtotal: {
            type: Number,
            required: true
        },
        deliveryFee: {
            type: Number,
            default: 50 // Default delivery fee for Kathmandu
        },
        tax: {
            type: Number,
            default: 0
        },
        discount: {
            type: Number,
            default: 0
        },
        total: {
            type: Number,
            required: true
        }
    },

    // Order Status
    status: {
        type: String,
        enum: [
            'pending',              // Order placed, waiting for prescription verification (if needed)
            'prescription_verified', // Prescription verified, processing order
            'confirmed',            // Order confirmed and being prepared
            'packed',              // Order packed, ready for delivery
            'out_for_delivery',    // Out for delivery
            'delivered',           // Successfully delivered
            'cancelled',           // Order cancelled
            'returned'             // Order returned
        ],
        default: 'pending'
    },

    // Payment Information
    payment: {
        method: {
            type: String,
            enum: ['cod', 'esewa', 'khalti', 'bank_transfer'],
            default: 'cod'
        },
        status: {
            type: String,
            enum: ['pending', 'paid', 'failed', 'refunded'],
            default: 'pending'
        },
        transactionId: String,
        paidAt: Date
    },

    // Delivery Information
    delivery: {
        assignedTo: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User' // Delivery person
        },
        estimatedDeliveryTime: {
            type: Date,
            default: function () {
                // Default 24 hours from now
                return new Date(Date.now() + 24 * 60 * 60 * 1000);
            }
        },
        actualDeliveryTime: Date,
        deliveryAttempts: {
            type: Number,
            default: 0
        },
        lastAttemptAt: Date,
        deliveryNotes: String
    },

    // Order Notes
    notes: {
        customerNotes: String,
        pharmacistNotes: String,
        deliveryNotes: String,
        internalNotes: String
    },

    // Revenue Tracking
    revenue: {
        recorded: {
            type: Boolean,
            default: false
        },
        recordedAt: Date,
        grossRevenue: Number, // Total amount received
        netRevenue: Number,   // After delivery costs, etc.
        profit: Number        // Revenue minus product costs
    },

    // Cancellation Information
    cancellation: {
        reason: String,
        cancelledBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        cancelledAt: Date,
        refundAmount: Number,
        refundProcessed: {
            type: Boolean,
            default: false
        }
    },

    // Audit Trail
    statusHistory: [{
        status: String,
        changedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        changedAt: {
            type: Date,
            default: Date.now
        },
        notes: String
    }],

    // Timestamps
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Indexes for better performance
OrderSchema.index({ orderNumber: 1 }, { unique: true, sparse: true });
OrderSchema.index({ 'customer.user': 1 });
OrderSchema.index({ status: 1 });
OrderSchema.index({ createdAt: -1 });
OrderSchema.index({ 'delivery.assignedTo': 1 });
OrderSchema.index({ prescriptionStatus: 1 });

// Pre-save middleware - FIXED to properly generate orderNumber
OrderSchema.pre('save', function (next) {
    // Generate order number if not exists and this is a new document
    if (this.isNew && !this.orderNumber) {
        const date = new Date();
        const year = date.getFullYear().toString().slice(-2);
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        this.orderNumber = `FP${year}${month}${day}${random}`;

        console.log('Generated order number:', this.orderNumber);
    }

    // Check if order has prescription items
    this.hasPrescriptionItems = this.items.some(item => item.prescriptionRequired);

    // Set prescription status based on items
    if (this.hasPrescriptionItems && this.prescriptionStatus === 'not_required') {
        this.prescriptionStatus = 'pending_verification';
    }

    // Calculate totals
    this.pricing.subtotal = this.items.reduce((total, item) => total + item.totalPrice, 0);
    this.pricing.total = this.pricing.subtotal + this.pricing.deliveryFee + this.pricing.tax - this.pricing.discount;

    // Update timestamp
    this.updatedAt = new Date();

    next();
});

// Instance Methods

// Update order status with history tracking
OrderSchema.methods.updateStatus = async function (newStatus, updatedBy, notes = '') {
    const oldStatus = this.status;
    this.status = newStatus;

    // Add to status history
    this.statusHistory.push({
        status: newStatus,
        changedBy: updatedBy,
        notes: notes
    });

    // Handle status-specific actions
    switch (newStatus) {
        case 'delivered':
            this.delivery.actualDeliveryTime = new Date();
            this.payment.status = 'paid'; // For COD orders
            this.payment.paidAt = new Date();
            // Record revenue
            await this.recordRevenue();
            break;

        case 'cancelled':
            // Release reserved stock
            await this.releaseReservedStock();
            break;
    }

    return await this.save();
};

// Record revenue when order is delivered
OrderSchema.methods.recordRevenue = async function () {
    if (this.status === 'delivered' && !this.revenue.recorded) {
        this.revenue.grossRevenue = this.pricing.total;
        this.revenue.netRevenue = this.pricing.total - this.pricing.deliveryFee;

        // Calculate profit (you might want to store cost price in product)
        let totalCost = 0;
        for (const item of this.items) {
            // Assuming 70% of price is cost (you can modify this logic)
            totalCost += item.totalPrice * 0.7;
        }

        this.revenue.profit = this.revenue.netRevenue - totalCost;
        this.revenue.recorded = true;
        this.revenue.recordedAt = new Date();

        return await this.save();
    }
};

// Release reserved stock (for cancelled orders)
OrderSchema.methods.releaseReservedStock = async function () {
    const Product = mongoose.model('Product');

    for (const item of this.items) {
        const product = await Product.findById(item.product);
        if (product) {
            // Calculate how much stock to release
            let stockToRelease;
            if (item.purchaseType === 'unit' && ['tablet', 'capsule'].includes(product.productType)) {
                const unitsPerStrip = Number(product.unitsPerStrip) || 1;
                stockToRelease = Math.ceil(item.quantity / unitsPerStrip);
            } else {
                stockToRelease = item.quantity;
            }

            await product.releaseReservedStock(stockToRelease);
        }
    }
};

// Confirm sale and deduct actual stock
OrderSchema.methods.confirmSale = async function () {
    const Product = mongoose.model('Product');

    for (const item of this.items) {
        const product = await Product.findById(item.product);
        if (product) {
            // Calculate how much stock to deduct
            let stockToDeduct;
            if (item.purchaseType === 'unit' && ['tablet', 'capsule'].includes(product.productType)) {
                const unitsPerStrip = Number(product.unitsPerStrip) || 1;
                stockToDeduct = Math.ceil(item.quantity / unitsPerStrip);
            } else {
                stockToDeduct = item.quantity;
            }

            await product.deductStock(stockToDeduct);
        }
    }
};

// Static Methods

// Find orders by customer
OrderSchema.statics.findByCustomer = function (userId) {
    return this.find({ 'customer.user': userId })
        .populate('items.product')
        .sort({ createdAt: -1 });
};

// Find orders by status
OrderSchema.statics.findByStatus = function (status) {
    return this.find({ status })
        .populate('items.product customer.user delivery.assignedTo')
        .sort({ createdAt: -1 });
};

// Find orders requiring prescription verification
OrderSchema.statics.findPendingPrescriptionVerification = function () {
    return this.find({
        prescriptionStatus: 'pending_verification',
        hasPrescriptionItems: true
    })
        .populate('items.product customer.user')
        .sort({ createdAt: 1 });
};

// Revenue analytics
OrderSchema.statics.getRevenueStats = function (startDate, endDate) {
    return this.aggregate([
        {
            $match: {
                status: 'delivered',
                'revenue.recorded': true,
                createdAt: {
                    $gte: startDate,
                    $lte: endDate
                }
            }
        },
        {
            $group: {
                _id: null,
                totalRevenue: { $sum: '$revenue.grossRevenue' },
                totalProfit: { $sum: '$revenue.profit' },
                totalOrders: { $sum: 1 },
                averageOrderValue: { $avg: '$pricing.total' }
            }
        }
    ]);
};

module.exports = mongoose.model('Order', OrderSchema);