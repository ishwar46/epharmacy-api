const Order = require('../models/Order');
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const messages = require('../config/messages');

// Define available promo codes with their rules
const PROMO_CODES = {
    'FIRSTORDER': {
        type: 'percentage',
        value: 10, // 10% discount
        description: 'First Order Discount',
        minAmount: 0,
        maxDiscount: null,
        oneTimeUse: true,
        userLimit: 1, // One per user
        totalLimit: null, // Unlimited total uses
        validFrom: null,
        validUntil: null,
        applicableCategories: null // All categories
    },
    'SAVE20': {
        type: 'percentage',
        value: 20, // 20% discount
        description: 'Save 20% on your order',
        minAmount: 100, // Minimum Rs. 1000 order
        maxDiscount: 500, // Maximum Rs. 500 discount
        oneTimeUse: false,
        userLimit: 3, // 3 times per user
        totalLimit: 1000, // Total 1000 uses across all users
        validFrom: null,
        validUntil: null,
        applicableCategories: null
    },
    'FLAT100': {
        type: 'fixed',
        value: 100, // Rs. 100 flat discount
        description: 'Flat Rs. 100 off',
        minAmount: 500, // Minimum Rs. 500 order
        maxDiscount: null,
        oneTimeUse: false,
        userLimit: 5, // 5 times per user
        totalLimit: null,
        validFrom: null,
        validUntil: null,
        applicableCategories: ['Medicine', 'Health Care']
    },
    'WELCOME50': {
        type: 'fixed',
        value: 50, // Rs. 50 flat discount
        description: 'Welcome discount for new users',
        minAmount: 200, // Minimum Rs. 200 order
        maxDiscount: null,
        oneTimeUse: true,
        userLimit: 1,
        totalLimit: 500, // Limited to 500 total uses
        validFrom: null,
        validUntil: null,
        applicableCategories: null
    },
    'STUDENT15': {
        type: 'percentage',
        value: 15, // 15% discount
        description: 'Student discount',
        minAmount: 300,
        maxDiscount: 200, // Maximum Rs. 200 discount
        oneTimeUse: false,
        userLimit: null, // Unlimited per user
        totalLimit: null,
        validFrom: null,
        validUntil: null,
        applicableCategories: null
    },
    'BULK25': {
        type: 'percentage',
        value: 25, // 25% discount
        description: 'Bulk order discount',
        minAmount: 2000, // Minimum Rs. 2000 order
        maxDiscount: 1000, // Maximum Rs. 1000 discount
        oneTimeUse: false,
        userLimit: 2, // 2 times per user
        totalLimit: null,
        validFrom: null,
        validUntil: null,
        applicableCategories: null
    }
};

// Function to validate and calculate promo code discount
const validatePromoCode = async (promoCode, userId, totalPrice, orderItems) => {
    const promo = PROMO_CODES[promoCode];

    if (!promo) {
        throw new Error('Invalid promo code');
    }

    // Check if promo code is currently valid (date range)
    const now = new Date();
    if (promo.validFrom && now < new Date(promo.validFrom)) {
        throw new Error('Promo code is not yet active');
    }
    if (promo.validUntil && now > new Date(promo.validUntil)) {
        throw new Error('Promo code has expired');
    }

    // Check minimum order amount
    if (totalPrice < promo.minAmount) {
        throw new Error(`Minimum order amount of Rs. ${promo.minAmount} required for this promo code`);
    }

    // Check category restrictions
    if (promo.applicableCategories) {
        const orderCategories = orderItems.map(item => item.productCategory);
        const hasApplicableCategory = orderCategories.some(category =>
            promo.applicableCategories.includes(category)
        );
        if (!hasApplicableCategory) {
            throw new Error(`This promo code is only applicable for ${promo.applicableCategories.join(', ')} categories`);
        }
    }

    // Check user-specific limits
    if (promo.userLimit) {
        const userOrdersWithPromo = await Order.countDocuments({
            user: userId,
            promoCodeUsed: promoCode
        });

        if (userOrdersWithPromo >= promo.userLimit) {
            throw new Error(`You have already used this promo code ${promo.userLimit} time(s)`);
        }
    }

    // Check if it's a one-time use promo and user has used it before
    if (promo.oneTimeUse) {
        const hasUsedBefore = await Order.findOne({
            user: userId,
            promoCodeUsed: promoCode
        });

        if (hasUsedBefore) {
            throw new Error('This promo code can only be used once per user');
        }
    }

    // Check total usage limit across all users
    if (promo.totalLimit) {
        const totalUsage = await Order.countDocuments({ promoCodeUsed: promoCode });
        if (totalUsage >= promo.totalLimit) {
            throw new Error('This promo code has reached its usage limit');
        }
    }

    // Calculate discount
    let discount = 0;
    if (promo.type === 'percentage') {
        discount = totalPrice * (promo.value / 100);
        // Apply maximum discount limit if specified
        if (promo.maxDiscount && discount > promo.maxDiscount) {
            discount = promo.maxDiscount;
        }
    } else if (promo.type === 'fixed') {
        discount = promo.value;
        // Don't let fixed discount exceed total price
        if (discount > totalPrice) {
            discount = totalPrice;
        }
    }

    return {
        discount,
        description: promo.description,
        type: promo.type,
        value: promo.value
    };
};

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
                productBrand: product.brand,
                productCategory: product.category,
                quantity: item.quantity,
                price: product.price
            });
            totalPrice += product.price * item.quantity;
        }

        // Auto-Increment Order Number
        const lastOrder = await Order.findOne().sort({ createdAt: -1 });
        let orderNumber = "#FIX001";
        if (lastOrder && lastOrder.orderNumber) {
            const lastNumber = parseInt(lastOrder.orderNumber.replace("#FIX", ""));
            orderNumber = `#FIX${(lastNumber + 1).toString().padStart(3, "0")}`;
        }

        // Handle promo code validation and discount calculation
        let discount = 0;
        let finalPrice = totalPrice;
        let promoDetails = null;

        if (promoCode) {
            try {
                promoDetails = await validatePromoCode(promoCode, userId, totalPrice, orderItems);
                discount = promoDetails.discount;
                finalPrice = totalPrice - discount;
            } catch (error) {
                return res.status(400).json({
                    success: false,
                    message: error.message
                });
            }
        }

        // Create order data object
        const orderData = {
            user: userId,
            orderNumber,
            orderItems,
            totalPrice,
            discount,
            finalPrice,
            shippingAddress,
            contactInfo,
            paymentMethod: 'Cash on Delivery',
            paymentStatus: 'pending',
            amountPaid: 0
        };

        // Add promo code fields if promo code was used
        if (promoCode && promoDetails) {
            orderData.promoCodeUsed = promoCode;
            orderData.promoDetails = {
                code: promoCode,
                description: promoDetails.description,
                type: promoDetails.type,
                value: promoDetails.value,
                discountApplied: discount
            };
        }

        // Create the order with generated order number
        const order = await Order.create(orderData);

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

// Get available promo codes for a user
exports.getAvailablePromoCodes = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const availableCodes = [];

        for (const [code, promo] of Object.entries(PROMO_CODES)) {
            try {
                // Check if user can use this promo code (basic validation)
                const now = new Date();

                // Skip if not yet active or expired
                if (promo.validFrom && now < new Date(promo.validFrom)) continue;
                if (promo.validUntil && now > new Date(promo.validUntil)) continue;

                // Check user limits
                if (promo.userLimit) {
                    const userUsageCount = await Order.countDocuments({
                        user: userId,
                        promoCodeUsed: code
                    });
                    if (userUsageCount >= promo.userLimit) continue;
                }

                // Check one-time use
                if (promo.oneTimeUse) {
                    const hasUsed = await Order.findOne({
                        user: userId,
                        promoCodeUsed: code
                    });
                    if (hasUsed) continue;
                }

                // Check total limit
                if (promo.totalLimit) {
                    const totalUsage = await Order.countDocuments({ promoCodeUsed: code });
                    if (totalUsage >= promo.totalLimit) continue;
                }

                availableCodes.push({
                    code,
                    description: promo.description,
                    type: promo.type,
                    value: promo.value,
                    minAmount: promo.minAmount,
                    maxDiscount: promo.maxDiscount,
                    applicableCategories: promo.applicableCategories
                });
            } catch (error) {
                // Skip this promo code if there's an error
                continue;
            }
        }

        res.status(200).json({
            success: true,
            data: availableCodes
        });
    } catch (error) {
        next(error);
    }
};

// Validate a promo code before order placement
exports.validatePromoCodeEndpoint = async (req, res, next) => {
    try {
        const { promoCode, cartTotal } = req.body;
        const userId = req.user._id;

        if (!promoCode) {
            return res.status(400).json({
                success: false,
                message: 'Promo code is required'
            });
        }

        // Get user's cart to check categories
        const cart = await Cart.findOne({ user: userId }).populate('items.product');
        if (!cart || cart.items.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Cart is empty'
            });
        }

        const orderItems = cart.items.map(item => ({
            productCategory: item.product.category
        }));

        const totalPrice = cartTotal || cart.items.reduce((total, item) =>
            total + (item.product.price * item.quantity), 0
        );

        const promoDetails = await validatePromoCode(promoCode, userId, totalPrice, orderItems);

        res.status(200).json({
            success: true,
            message: 'Promo code is valid',
            data: {
                promoCode,
                discount: promoDetails.discount,
                description: promoDetails.description,
                finalAmount: totalPrice - promoDetails.discount
            }
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

exports.getOrders = async (req, res, next) => {
    try {
        const orders = await Order.find()
            .populate("user", "name email phone")
            .populate("orderItems.product", "name description brand category price stock")
            .sort({ createdAt: -1 }); // Most recent orders first

        res.status(200).json({ success: true, count: orders.length, data: orders });
    } catch (error) {
        next(error);
    }
};

exports.getOrder = async (req, res, next) => {
    try {
        const order = await Order.findById(req.params.id)
            .populate("user", "name email phone address")
            .populate("orderItems.product", "name description brand category price stock images");

        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        res.status(200).json({ success: true, data: order });
    } catch (error) {
        next(error);
    }
};

// Update order status
exports.updateOrderStatus = async (req, res, next) => {
    try {
        const { status, deliveryPersonName, deliveryPersonContact, estimatedArrivalTime } = req.body;
        const orderId = req.params.id;

        const validStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'out for delivery', 'delivered', 'cancelled'];

        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid order status'
            });
        }

        const updateData = { status };

        // Add delivery details if provided
        if (deliveryPersonName) updateData.deliveryPersonName = deliveryPersonName;
        if (deliveryPersonContact) updateData.deliveryPersonContact = deliveryPersonContact;
        if (estimatedArrivalTime) updateData.estimatedArrivalTime = estimatedArrivalTime;

        const order = await Order.findByIdAndUpdate(
            orderId,
            updateData,
            { new: true, runValidators: true }
        )
            .populate("user", "name email phone")
            .populate("orderItems.product", "name description brand category price");

        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        res.status(200).json({
            success: true,
            message: 'Order updated successfully',
            data: order
        });
    } catch (error) {
        next(error);
    }
};

// Get user's own orders (for customer portal)
exports.getUserOrders = async (req, res, next) => {
    try {
        const userId = req.user._id;

        const orders = await Order.find({ user: userId })
            .populate("orderItems.product", "name description brand category price images")
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: orders.length,
            data: orders
        });
    } catch (error) {
        next(error);
    }
};