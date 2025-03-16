const Order = require('../models/Order');
const messages = require('../config/messages');

// Get all orders
// getAllOrders: filtering by user's email
exports.getAllOrders = async (req, res, next) => {
    try {
        let query = {};
        if (req.query.name) {
            query = { 'user.name': req.query.name };
        }
        const orders = await Order.find(query).populate('user', 'name email contactInfo');
        res.status(200).json({ success: true, count: orders.length, data: orders });
    } catch (error) {
        next(error);
    }
};


// Get a single order by order ID (Admin view)
exports.getOrderById = async (req, res, next) => {
    try {
        const order = await Order.findById(req.params.orderId).populate('user', 'name email contactInfo');
        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }
        res.status(200).json({ success: true, data: order });
    } catch (error) {
        next(error);
    }
};

// Update order status and payment details (Admin only)
exports.updateOrder = async (req, res, next) => {
    try {
        const { status, paymentStatus, amountPaid, paymentDate } = req.body;
        const order = await Order.findById(req.params.orderId);
        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        // Save previous status to check for cancellation
        const previousStatus = order.status;

        // Update order status if provided
        if (status) {
            order.status = status;
        }

        // Update payment details if provided
        if (paymentStatus) {
            order.paymentStatus = paymentStatus;
        }
        if (amountPaid !== undefined) {
            order.amountPaid = amountPaid;
        }
        if (paymentDate) {
            order.paymentDate = paymentDate;
        }

        // If order is being cancelled and wasn't already cancelled,
        // refill the stock by adding back the ordered quantities.
        if (status === 'cancelled' && previousStatus !== 'cancelled') {
            for (const item of order.orderItems) {
                await Product.findByIdAndUpdate(item.product, { $inc: { stock: item.quantity } });
            }
        }

        await order.save();
        res.status(200).json({
            success: true,
            message: 'Order updated successfully',
            data: order
        });
    } catch (error) {
        next(error);
    }
};