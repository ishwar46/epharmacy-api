const express = require('express');
const router = express.Router();

const {
    createOrder,
    getUserOrders,
    getOrder,
    updateOrder,
    updateOrderStatus,
    cancelOrder,
    verifyPrescription,
    getAllOrders,
    getPendingPrescriptions,
    assignDeliveryPerson,
    getRevenueAnalytics,
    getOrderAnalytics,
    trackOrder
} = require('../controllers/orderController');

const { protect, authorize, optionalAuth } = require('../middleware/auth');

// ==========================================
// PUBLIC ROUTES
// ==========================================

// Create order from cart (supports guest orders)
// POST /api/orders
router.post('/', optionalAuth, createOrder);

// Track order publicly
// GET /api/orders/track/:orderNumber
router.get('/track/:orderNumber', trackOrder);

// ==========================================
// SPECIFIC ROUTES (MUST COME BEFORE /:id)
// ==========================================

// Get all orders (Admin/Pharmacist only)
// GET /api/orders/all
router.get('/all', protect, authorize('admin', 'pharmacist'), getAllOrders);

// Get orders requiring prescription verification
// GET /api/orders/pending-prescriptions
router.get('/pending-prescriptions', protect, authorize('admin', 'pharmacist'), getPendingPrescriptions);

// Get revenue analytics
// GET /api/orders/analytics/revenue
router.get('/analytics/revenue', protect, authorize('admin'), getRevenueAnalytics);

// Get order analytics
// GET /api/orders/analytics/orders
router.get('/analytics/orders', protect, authorize('admin'), getOrderAnalytics);

// ==========================================
// PROTECTED ROUTES (Require Authentication)
// ==========================================

// Get user's orders
// GET /api/orders
router.get('/', protect, getUserOrders);

// Get single order - MOVED AFTER SPECIFIC ROUTES
// GET /api/orders/:id
router.get('/:id', protect, getOrder);

// Cancel order (user can cancel their own orders)
// PUT /api/orders/:id/cancel
router.put('/:id/cancel', protect, cancelOrder);

// Update order status
// PUT /api/orders/:id/status
router.put('/:id/status', protect, authorize('admin', 'pharmacist'), updateOrderStatus);

// Verify prescription
// PUT /api/orders/:id/verify-prescription
router.put('/:id/verify-prescription', protect, authorize('admin', 'pharmacist'), verifyPrescription);

// Assign delivery person
// PUT /api/orders/:id/assign-delivery
router.put('/:id/assign-delivery', protect, authorize('admin'), assignDeliveryPerson);

// General update order (Admin only)
// PUT /api/orders/:id
router.put('/:id', protect, authorize('admin', 'pharmacist'), updateOrder);


module.exports = router;