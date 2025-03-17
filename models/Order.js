const mongoose = require('mongoose');

const OrderItemSchema = new mongoose.Schema({
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
    },
    productName: {
        type: String,
        required: true
    },
    productDescription: {
        type: String,
        required: true
    },
    quantity: {
        type: Number,
        required: true,
        min: [1, 'Quantity cannot be less than 1']
    },
    price: {
        type: Number,
        required: true
    }
}, { _id: false });

const ShippingAddressSchema = new mongoose.Schema({
    addressLine1: {
        type: String,
        required: [true, 'Please provide address line 1']
    },
    addressLine2: {
        type: String
    },
    city: {
        type: String,
        required: [true, 'Please provide city']
    },
    state: {
        type: String,
        required: [true, 'Please provide state']
    },
    postalCode: {
        type: String,
        required: [true, 'Please provide postal code']
    },
    country: {
        type: String,
        required: [true, 'Please provide country']
    }
}, { _id: false });

const ContactInfoSchema = new mongoose.Schema({
    phone: {
        type: String,
        required: [true, 'Please provide a contact phone number']
    },
    email: {
        type: String,
        required: [true, 'Please provide a contact email']
    }
}, { _id: false });

const OrderSchema = new mongoose.Schema({
    orderNumber: {
        type: String,
        unique: true,
        required: true
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    orderItems: [OrderItemSchema],
    totalPrice: {
        type: Number,
        required: true
    },
    discount: {
        type: Number,
        default: 0
    },
    finalPrice: {
        type: Number,
        required: true
    },
    promoCodeUsed: {
        type: String
    },
    shippingAddress: {
        type: ShippingAddressSchema,
        required: true
    },
    contactInfo: {
        type: ContactInfoSchema,
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'processing', 'confirmed', 'shipped', 'out for delivery', 'delivered', 'cancelled'],
        default: 'pending'
    },
    paymentMethod: {
        type: String,
        default: 'Cash on Delivery'
    },
    paymentStatus: {
        type: String,
        enum: ['pending', 'paid', 'failed', 'refunded'],
        default: 'pending'
    },
    amountPaid: {
        type: Number,
        default: 0
    },
    paymentDate: {
        type: Date
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

OrderSchema.pre('save', function (next) {
    if (this.paymentStatus === 'paid' && !this.paymentDate) {
        this.paymentDate = new Date();
    }
    next();
});

module.exports = mongoose.model('Order', OrderSchema);
