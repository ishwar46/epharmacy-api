const mongoose = require('mongoose');

const OrderItemSchema = new mongoose.Schema({
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
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
});

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
});

const ContactInfoSchema = new mongoose.Schema({
    phone: {
        type: String,
        required: [true, 'Please provide a contact phone number']
    },
    email: {
        type: String,
        required: [true, 'Please provide a contact email']
    }
});

const OrderSchema = new mongoose.Schema({
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
        enum: ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'],
        default: 'pending'
    },
    paymentMethod: {
        type: String,
        default: 'Cash on Delivery'
    },
    paymentStatus: {
        type: String,
        enum: ['pending', 'paid', 'failed'],
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
});

module.exports = mongoose.model('Order', OrderSchema);
