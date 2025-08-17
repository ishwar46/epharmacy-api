const Order = require('../models/Order');
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const User = require('../models/User');
const emailService = require('../utils/emailService');

// Helper function to calculate delivery fee based on location
const calculateDeliveryFee = (city, area) => {
    // Simple delivery fee calculation for Nepal
    const biratnagar = ['biratnagar', 'itahari'];

    if (biratnagar.includes(city.toLowerCase())) {
        return 50;
    }
    return 100; // Rs. 100 for outside valley
};

// Helper function to validate prescription requirements
const validatePrescriptionRequirements = (items, prescriptions) => {
    const prescriptionItems = items.filter(item => item.prescriptionRequired);

    if (prescriptionItems.length > 0 && prescriptions.length === 0) {
        return {
            valid: false,
            message: 'Prescription is required for prescription medicines in your cart'
        };
    }

    return { valid: true };
};

// @desc    Create order from cart
// @route   POST /api/orders
// @access  Public (supports guest orders)
exports.createOrder = async (req, res, next) => {
    try {
        const { deliveryAddress, paymentMethod = 'cod', guestDetails, customerNotes, prescriptions = [] } = req.body;

        // Add these debug logs:
        console.log('Full request body:', JSON.stringify(req.body, null, 2));
        console.log('Delivery address:', deliveryAddress);
        console.log('Street check:', deliveryAddress?.street);
        console.log('Area check:', deliveryAddress?.area);
        console.log('City check:', deliveryAddress?.city);

        const userId = req.user?.id || null;
        const guestId = req.headers['x-guest-id'] || req.body.guestId || null;

        // Validate required fields
        if (!deliveryAddress || !deliveryAddress.street || !deliveryAddress.area || !deliveryAddress.city) {
            return res.status(400).json({
                success: false,
                message: 'Complete delivery address is required'
            });
        }

        // For guest orders, validate guest details
        if (!userId && (!guestDetails || !guestDetails.name || !guestDetails.email || !guestDetails.phone)) {
            return res.status(400).json({
                success: false,
                message: 'Guest details (name, email, phone) are required for guest orders'
            });
        }

        // Get cart
        const cart = await Cart.findActiveCart(userId, guestId);
        if (!cart || cart.items.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Cart is empty or not found'
            });
        }

        // Check for expired cart
        if (cart.isExpired) {
            return res.status(400).json({
                success: false,
                message: 'Cart has expired. Please add items again.'
            });
        }

        // Validate stock availability and prepare order items
        const orderItems = [];
        let hasPrescriptionItems = false;

        for (const cartItem of cart.items) {
            const product = await Product.findById(cartItem.product);

            if (!product || product.status !== 'active') {
                return res.status(400).json({
                    success: false,
                    message: `Product ${product?.name || 'Unknown'} is no longer available`
                });
            }

            // Calculate stock needed
            let stockNeeded;
            if (cartItem.purchaseType === 'unit' && ['tablet', 'capsule'].includes(product.productType)) {
                stockNeeded = Math.ceil(cartItem.quantity / product.unitsPerStrip);
            } else {
                stockNeeded = cartItem.quantity;
            }

            // Check stock availability
            if (product.availableStock < stockNeeded) {
                return res.status(400).json({
                    success: false,
                    message: `Insufficient stock for ${product.name}. Available: ${product.availableStock} ${product.stockUnit}`
                });
            }

            // Check if prescription is required
            const prescriptionRequired = product.medicineType === 'Prescription';
            if (prescriptionRequired) {
                hasPrescriptionItems = true;
            }

            // Create order item with product snapshot
            orderItems.push({
                product: product._id,
                productSnapshot: {
                    name: product.name,
                    brand: product.brand,
                    category: product.category,
                    medicineType: product.medicineType,
                    productType: product.productType,
                    price: product.price,
                    image: product.images[0] || ''
                },
                quantity: cartItem.quantity,
                purchaseType: cartItem.purchaseType,
                pricePerItem: cartItem.pricePerItem,
                totalPrice: cartItem.totalPrice,
                prescriptionRequired
            });
        }

        // Validate prescription requirements
        const prescriptionValidation = validatePrescriptionRequirements(orderItems, prescriptions);
        if (!prescriptionValidation.valid) {
            return res.status(400).json({
                success: false,
                message: prescriptionValidation.message
            });
        }

        // Calculate pricing
        const subtotal = orderItems.reduce((total, item) => total + item.totalPrice, 0);
        const deliveryFee = calculateDeliveryFee(deliveryAddress.city, deliveryAddress.area);
        const total = subtotal + deliveryFee;

        // Create order
        const orderData = {
            customer: {
                user: userId,
                guestDetails: userId ? undefined : guestDetails,
                isGuest: !userId
            },
            items: orderItems,
            prescriptions: prescriptions.map(p => ({
                imageUrl: p.imageUrl,
                fileName: p.fileName,
                doctorName: p.doctorName,
                hospitalName: p.hospitalName || '',
                prescriptionDate: new Date(p.prescriptionDate)
            })),
            hasPrescriptionItems,
            prescriptionStatus: hasPrescriptionItems ? 'pending_verification' : 'not_required',
            deliveryAddress: {
                name: deliveryAddress.name || (userId ? req.user.name : guestDetails.name),
                phone: deliveryAddress.phone || (userId ? req.user.phone : guestDetails.phone),
                street: deliveryAddress.street,
                area: deliveryAddress.area,
                city: deliveryAddress.city,
                landmark: deliveryAddress.landmark || '',
                deliveryInstructions: deliveryAddress.deliveryInstructions || ''
            },
            pricing: {
                subtotal,
                deliveryFee,
                total
            },
            payment: {
                method: paymentMethod
            },
            notes: {
                customerNotes: customerNotes || ''
            }
        };

        const order = new Order(orderData);
        await order.save();

        // Convert cart stock reservations to order stock reservations
        // The stock is already reserved in cart, so we just need to confirm it's still reserved
        for (const cartItem of cart.items) {
            const product = await Product.findById(cartItem.product);
            // Stock is already reserved from cart, no additional reservation needed
        }

        // Clear the cart after successful order creation
        await cart.clearCart();

        // Populate the order for response
        const populatedOrder = await Order.findById(order._id)
            .populate('items.product', 'name brand images')
            .populate('customer.user', 'name email phone');

        // Send order confirmation email
        try {
            const customerEmail = userId 
                ? populatedOrder.customer.user?.email
                : guestDetails.email;

            if (customerEmail) {
                await emailService.sendOrderConfirmation(customerEmail, populatedOrder);
                console.log(`Order confirmation email sent to ${customerEmail} for order ${populatedOrder.orderNumber}`);
            }
        } catch (emailError) {
            console.error('Error sending order confirmation email:', emailError);
            // Don't fail the order creation if email fails
        }

        res.status(201).json({
            success: true,
            message: 'Order created successfully',
            data: populatedOrder
        });

    } catch (error) {
        console.error('Create order error:', error);
        next(error);
    }
};

// @desc    Get user orders
// @route   GET /api/orders
// @access  Private
exports.getUserOrders = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const orders = await Order.find({ 'customer.user': userId })
            .populate('items.product', 'name brand images')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const total = await Order.countDocuments({ 'customer.user': userId });

        res.status(200).json({
            success: true,
            data: orders,
            pagination: {
                current: page,
                pages: Math.ceil(total / limit),
                total
            }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get single order
// @route   GET /api/orders/:id
// @access  Private
exports.getOrder = async (req, res, next) => {
    try {
        console.log('=== GET ORDER DEBUG ===');
        console.log('Requested Order ID:', req.params.id);
        console.log('Current User ID:', req.user.id);
        console.log('Current User Role:', req.user.role);

        const order = await Order.findById(req.params.id)
            .populate('items.product')
            .populate('customer.user', 'name email phone')
            .populate('delivery.assignedTo', 'name phone')
            .populate('statusHistory.changedBy', 'name');

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        // FIXED: Use _id property when populated
        const orderUserId = order.customer.user?._id?.toString() || order.customer.user?.toString();

        console.log('Order Customer User ID:', orderUserId);
        console.log('Current User ID:', req.user.id);
        console.log('IDs Match:', orderUserId === req.user.id);

        // Check if user has access to this order
        if (req.user.role !== 'admin' &&
            req.user.role !== 'pharmacist' &&
            orderUserId !== req.user.id) {

            console.log('Access denied - user not authorized');
            return res.status(403).json({
                success: false,
                message: 'Not authorized to access this order'
            });
        }

        console.log('Access granted');
        res.status(200).json({
            success: true,
            data: order
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Update order status
// @route   PUT /api/orders/:id/status
// @access  Private (Admin/Pharmacist only)
exports.updateOrderStatus = async (req, res, next) => {
    try {
        const { status, notes } = req.body;

        const order = await Order.findById(req.params.id);
        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        // Update status with audit trail
        await order.updateStatus(status, req.user.id, notes);

        // If confirming order, deduct actual stock
        if (status === 'confirmed') {
            await order.confirmSale();
        }

        const updatedOrder = await Order.findById(order._id)
            .populate('items.product')
            .populate('customer.user', 'name email phone')
            .populate('statusHistory.changedBy', 'name');

        // Send status update email to customer
        try {
            const customerEmail = updatedOrder.customer.user?.email || 
                                updatedOrder.customer.guestDetails?.email;

            if (customerEmail) {
                await emailService.sendOrderStatusUpdate(customerEmail, updatedOrder, status, notes);
                console.log(`Status update email sent to ${customerEmail} for order ${updatedOrder.orderNumber} - Status: ${status}`);
            }
        } catch (emailError) {
            console.error('Error sending status update email:', emailError);
            // Don't fail the status update if email fails
        }

        res.status(200).json({
            success: true,
            message: 'Order status updated successfully',
            data: updatedOrder
        });
    } catch (error) {
        console.error('Update order status error:', error);
        next(error);
    }
};

// @desc    Cancel order
// @route   PUT /api/orders/:id/cancel
// @access  Private
exports.cancelOrder = async (req, res, next) => {
    try {
        const { reason } = req.body;

        const order = await Order.findById(req.params.id);
        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        // Check if user can cancel this order
        if (req.user.role !== 'admin' &&
            req.user.role !== 'pharmacist' &&
            order.customer.user?.toString() !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to cancel this order'
            });
        }

        // Check if order can be cancelled
        if (['delivered', 'cancelled', 'returned'].includes(order.status)) {
            return res.status(400).json({
                success: false,
                message: 'This order cannot be cancelled'
            });
        }

        // Update cancellation details
        order.cancellation = {
            reason: reason || 'Cancelled by user',
            cancelledBy: req.user.id,
            cancelledAt: new Date()
        };

        // Update status to cancelled
        await order.updateStatus('cancelled', req.user.id, `Order cancelled: ${reason}`);

        res.status(200).json({
            success: true,
            message: 'Order cancelled successfully',
            data: order
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Verify prescription
// @route   PUT /api/orders/:id/verify-prescription
// @access  Private (Pharmacist/Admin only)
exports.verifyPrescription = async (req, res, next) => {
    try {
        const { prescriptionId, verified, notes } = req.body;

        const order = await Order.findById(req.params.id);
        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        // Find the prescription
        const prescription = order.prescriptions.id(prescriptionId);
        if (!prescription) {
            return res.status(404).json({
                success: false,
                message: 'Prescription not found'
            });
        }

        // Update prescription verification
        prescription.verified = verified;
        prescription.verifiedBy = req.user.id;
        prescription.verifiedAt = new Date();
        prescription.verificationNotes = notes;

        if (!verified) {
            prescription.rejectionReason = notes;
        }

        // Check if all prescriptions are verified
        const allPrescriptionsVerified = order.prescriptions.every(p => p.verified);

        if (verified && allPrescriptionsVerified) {
            order.prescriptionStatus = 'verified';
            // Auto-update order status if all prescriptions are verified
            await order.updateStatus('prescription_verified', req.user.id, 'All prescriptions verified');
        } else if (!verified) {
            order.prescriptionStatus = 'rejected';
            await order.updateStatus('cancelled', req.user.id, 'Prescription rejected');
        }

        await order.save();

        const updatedOrder = await Order.findById(order._id)
            .populate('items.product')
            .populate('prescriptions.verifiedBy', 'name');

        res.status(200).json({
            success: true,
            message: verified ? 'Prescription verified successfully' : 'Prescription rejected',
            data: updatedOrder
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get all orders (Admin/Pharmacist)
// @route   GET /api/orders/all
// @access  Private (Admin/Pharmacist only)
exports.getAllOrders = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;
        const status = req.query.status;
        const prescriptionStatus = req.query.prescriptionStatus;

        // Build query
        const query = {};
        if (status) query.status = status;
        if (prescriptionStatus) query.prescriptionStatus = prescriptionStatus;

        const orders = await Order.find(query)
            .populate('items.product', 'name brand')
            .populate('customer.user', 'name email phone')
            .populate('delivery.assignedTo', 'name phone')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const total = await Order.countDocuments(query);

        res.status(200).json({
            success: true,
            data: orders,
            pagination: {
                current: page,
                pages: Math.ceil(total / limit),
                total
            }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get orders requiring prescription verification
// @route   GET /api/orders/pending-prescriptions
// @access  Private (Pharmacist/Admin only)
exports.getPendingPrescriptions = async (req, res, next) => {
    try {
        const orders = await Order.findPendingPrescriptionVerification();

        res.status(200).json({
            success: true,
            data: orders
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Assign delivery person
// @route   PUT /api/orders/:id/assign-delivery
// @access  Private (Admin only)
exports.assignDeliveryPerson = async (req, res, next) => {
    try {
        const { deliveryPersonId, estimatedDeliveryTime } = req.body;

        const order = await Order.findById(req.params.id);
        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        // Verify delivery person exists and has correct role
        const deliveryPerson = await User.findById(deliveryPersonId);
        if (!deliveryPerson || deliveryPerson.role !== 'delivery') {
            return res.status(400).json({
                success: false,
                message: 'Invalid delivery person'
            });
        }

        // Update delivery assignment
        order.delivery.assignedTo = deliveryPersonId;
        if (estimatedDeliveryTime) {
            order.delivery.estimatedDeliveryTime = new Date(estimatedDeliveryTime);
        }

        await order.save();

        const updatedOrder = await Order.findById(order._id)
            .populate('delivery.assignedTo', 'name phone email');

        res.status(200).json({
            success: true,
            message: 'Delivery person assigned successfully',
            data: updatedOrder
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get revenue analytics
// @route   GET /api/orders/analytics/revenue
// @access  Private (Admin only)
exports.getRevenueAnalytics = async (req, res, next) => {
    try {
        const { startDate, endDate, period = 'daily' } = req.query;

        const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const end = endDate ? new Date(endDate) : new Date();

        // Get overall revenue stats
        const revenueStats = await Order.getRevenueStats(start, end);

        // Get daily/weekly/monthly breakdown
        let groupBy;
        switch (period) {
            case 'weekly':
                groupBy = {
                    year: { $year: '$createdAt' },
                    week: { $week: '$createdAt' }
                };
                break;
            case 'monthly':
                groupBy = {
                    year: { $year: '$createdAt' },
                    month: { $month: '$createdAt' }
                };
                break;
            default: // daily
                groupBy = {
                    year: { $year: '$createdAt' },
                    month: { $month: '$createdAt' },
                    day: { $dayOfMonth: '$createdAt' }
                };
        }

        const periodBreakdown = await Order.aggregate([
            {
                $match: {
                    status: 'delivered',
                    'revenue.recorded': true,
                    createdAt: { $gte: start, $lte: end }
                }
            },
            {
                $group: {
                    _id: groupBy,
                    revenue: { $sum: '$revenue.grossRevenue' },
                    profit: { $sum: '$revenue.profit' },
                    orders: { $sum: 1 }
                }
            },
            { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1, '_id.week': 1 } }
        ]);

        res.status(200).json({
            success: true,
            data: {
                overall: revenueStats[0] || {
                    totalRevenue: 0,
                    totalProfit: 0,
                    totalOrders: 0,
                    averageOrderValue: 0
                },
                breakdown: periodBreakdown
            }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get order analytics
// @route   GET /api/orders/analytics/orders
// @access  Private (Admin only)
exports.getOrderAnalytics = async (req, res, next) => {
    try {
        // Order status distribution
        const statusDistribution = await Order.aggregate([
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 }
                }
            }
        ]);

        // Prescription vs OTC orders
        const prescriptionDistribution = await Order.aggregate([
            {
                $group: {
                    _id: '$hasPrescriptionItems',
                    count: { $sum: 1 }
                }
            }
        ]);

        // Payment method distribution
        const paymentMethodDistribution = await Order.aggregate([
            {
                $group: {
                    _id: '$payment.method',
                    count: { $sum: 1 }
                }
            }
        ]);

        // Top selling products
        const topProducts = await Order.aggregate([
            { $unwind: '$items' },
            {
                $group: {
                    _id: '$items.product',
                    totalQuantity: { $sum: '$items.quantity' },
                    totalRevenue: { $sum: '$items.totalPrice' },
                    orderCount: { $sum: 1 }
                }
            },
            { $sort: { totalQuantity: -1 } },
            { $limit: 10 },
            {
                $lookup: {
                    from: 'products',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'product'
                }
            },
            { $unwind: '$product' },
            {
                $project: {
                    productName: '$product.name',
                    brand: '$product.brand',
                    category: '$product.category',
                    totalQuantity: 1,
                    totalRevenue: 1,
                    orderCount: 1
                }
            }
        ]);

        res.status(200).json({
            success: true,
            data: {
                statusDistribution,
                prescriptionDistribution,
                paymentMethodDistribution,
                topProducts
            }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Track order (public endpoint for order tracking)
// @route   GET /api/orders/track/:orderNumber
// @access  Public
exports.trackOrder = async (req, res, next) => {
    try {
        const { orderNumber } = req.params;
        const { phone } = req.query; // For verification

        const order = await Order.findOne({ orderNumber })
            .populate('items.product', 'name brand')
            .populate('delivery.assignedTo', 'name phone')
            .select('-prescriptions -notes.internalNotes -revenue');

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        // Verify phone number for guest orders
        if (order.customer.isGuest) {
            if (!phone || order.customer.guestDetails.phone !== phone) {
                return res.status(403).json({
                    success: false,
                    message: 'Phone number verification required'
                });
            }
        }

        // Return tracking information
        const trackingInfo = {
            orderNumber: order.orderNumber,
            status: order.status,
            createdAt: order.createdAt,
            estimatedDeliveryTime: order.delivery.estimatedDeliveryTime,
            actualDeliveryTime: order.delivery.actualDeliveryTime,
            items: order.items.map(item => ({
                name: item.productSnapshot.name,
                brand: item.productSnapshot.brand,
                quantity: item.quantity,
                purchaseType: item.purchaseType
            })),
            deliveryAddress: order.deliveryAddress,
            statusHistory: order.statusHistory.map(h => ({
                status: h.status,
                changedAt: h.changedAt,
                notes: h.notes
            }))
        };

        res.status(200).json({
            success: true,
            data: trackingInfo
        });
    } catch (error) {
        next(error);
    }
};