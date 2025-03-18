// routes/product.js
const express = require('express');
const router = express.Router();
const {
    getProducts,
    getProduct,
    createProduct,
    updateProduct,
    deleteProduct
} = require('../controllers/productController');
const { protect, authorize } = require('../middleware/auth');
const uploadProductImages = require("../utils/uploadProductImages");

// Public routes
router.get('/', getProducts);
router.get('/:id', getProduct);

// Admin routes (protected)
router.post(
    '/',
    protect,
    authorize('admin'),
    uploadProductImages.array('images', 5), // up to 5 images
    createProduct
);

router.put(
    '/:id',
    protect,
    authorize('admin'),
    uploadProductImages.array('images', 5),
    updateProduct
);

router.delete('/:id', protect, authorize('admin'), deleteProduct);

module.exports = router;
