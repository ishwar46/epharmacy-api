const mongoose = require("mongoose");

const OrderSchema = new mongoose.Schema(
    {
        orderNumber: { type: String, unique: true, required: true },
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        orderItems: [
            {
                product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
                productName: { type: String, required: true },
                productDescription: { type: String, required: true },
                quantity: { type: Number, required: true, min: 1 },
                price: { type: Number, required: true },
            },
        ],
        totalPrice: { type: Number, required: true },
        finalPrice: { type: Number, required: true },
        shippingAddress: {
            addressLine1: { type: String, required: true },
            city: { type: String, required: true },
            state: { type: String, required: true },
            postalCode: { type: String, required: true },
            country: { type: String, required: true },
        },
        contactInfo: {
            phone: { type: String, required: true },
            email: { type: String, required: true },
        },
        status: {
            type: String,
            enum: ["pending", "processing", "confirmed", "shipped", "out for delivery", "delivered", "cancelled"],
            default: "pending",
        },
        paymentMethod: { type: String, default: "Cash on Delivery" },
        paymentStatus: {
            type: String,
            enum: ["pending", "paid", "failed", "refunded"],
            default: "pending",
        },
        amountPaid: { type: Number, default: 0 },
        paymentDate: { type: Date },
        createdAt: { type: Date, default: Date.now },

        deliveryPersonName: { type: String },
        deliveryPersonContact: { type: String },
        estimatedArrivalTime: { type: String },

        customerSignature: { type: String },
    },
    { timestamps: true }
);

module.exports = mongoose.model("Order", OrderSchema);
