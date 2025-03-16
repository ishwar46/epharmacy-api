const express = require('express');
const router = express.Router();
const { getAllOrders, updateOrder, getOrderById } = require('../controllers/adminOrderController');
const { protect, authorize } = require('../middleware/auth');

router.get('/', protect, authorize('admin'), getAllOrders);
router.get('/:orderId', protect, authorize('admin'), getOrderById);
router.put('/:orderId', protect, authorize('admin'), updateOrder);

module.exports = router;
