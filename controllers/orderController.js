const Order = require('../models/Order');
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const messages = require('../config/messages');

exports.createOrder = async (req, res, next) => {
    try {
        const { promoCode, shippingAddress, contactInfo } = req.body;
        const userId = req.user._id;

        // Validate shipping details
        if (!shippingAddress || !contactInfo) {
            return res.status(400).json({
                success: false,
                message: 'Shipping address and contact information are required'
            });
        }

        // Retrieve user's cart and ensure it's not empty
        const cart = await Cart.findOne({ user: userId }).populate('items.product');
        if (!cart || cart.items.length === 0) {
            return res.status(400).json({ success: false, message: messages.errors.cartEmpty });
        }

        let orderItems = [];
        let totalPrice = 0;

        // Validate cart items and compute total price, embedding product details
        for (const item of cart.items) {
            const product = item.product;
            if (item.quantity > product.stock) {
                return res.status(400).json({
                    success: false,
                    message: `Cannot order more than available stock for ${product.name}`
                });
            }
            orderItems.push({
                product: product._id,
                productName: product.name,
                productDescription: product.description,
                quantity: item.quantity,
                price: product.price
            });
            totalPrice += product.price * item.quantity;
        }

        // Generate Auto-Increment Order Number
        const lastOrder = await Order.findOne().sort({ createdAt: -1 });
        let orderNumber = "#FIX001";
        if (lastOrder && lastOrder.orderNumber) {
            const lastNumber = parseInt(lastOrder.orderNumber.replace("#FIX", ""));
            orderNumber = `#FIX${(lastNumber + 1).toString().padStart(3, "0")}`;
        }

        // Handle promo code validation
        let discount = 0;
        let finalPrice = totalPrice;
        if (promoCode) {
            if (promoCode !== 'FIRSTORDER') {
                return res.status(400).json({
                    success: false,
                    message: 'Promo code is not valid'
                });
            } else {
                const previousOrders = await Order.find({ user: userId });
                if (previousOrders.length > 0) {
                    return res.status(400).json({
                        success: false,
                        message: messages.errors.promoAlreadyUsed
                    });
                }
                discount = totalPrice * 0.10;
                finalPrice = totalPrice - discount;
            }
        }

        // Create the order with generated order number
        const order = await Order.create({
            user: userId,
            orderNumber,
            orderItems,
            totalPrice,
            discount,
            finalPrice,
            promoCodeUsed: promoCode === 'FIRSTORDER' ? promoCode : null,
            shippingAddress,
            contactInfo,
            paymentMethod: 'Cash on Delivery'
        });

        // Deduct ordered quantities from product stock
        for (const item of cart.items) {
            await Product.findByIdAndUpdate(item.product._id, { $inc: { stock: -item.quantity } });
        }

        // Clear the cart after order placement
        cart.items = [];
        await cart.save();

        res.status(201).json({
            success: true,
            message: messages.success.orderPlaced,
            data: order
        });
    } catch (error) {
        next(error);
    }
};


exports.getOrders = async (req, res, next) => {
    try {

        const orders = await Order.find()
            .populate("user", "name email");

        res.status(200).json({ success: true, count: orders.length, data: orders });
    } catch (error) {
        next(error);
    }
};



exports.getOrder = async (req, res, next) => {
    try {
        const order = await Order.findById(req.params.id)
            .populate("user", "name email");

        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        res.status(200).json({ success: true, data: order });
    } catch (error) {
        next(error);
    }
};




