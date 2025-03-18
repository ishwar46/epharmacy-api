const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const upload = require("../utils/multer");

const {
    getAllOrders,
    getOrderById,
    updateOrder
} = require('../controllers/adminOrderController');

// Protect & authorize to admin
router.use(protect, authorize('admin'));

// GET all orders
router.get('/', getAllOrders);

// GET single order by ID
router.get('/:orderId', getOrderById);

// Use ONE single PUT route that includes Multer's middleware:
router.put('/:orderId', upload.single('customerSignature'), updateOrder);

module.exports = router;
