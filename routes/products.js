const express = require('express');
const router = express.Router();
const {
    getProducts,
    getProduct,
    createProduct,
    updateProduct,
    updateStock,
    getLowStockProducts,
    deleteProduct
} = require('../controllers/productController');
const { protect, authorize } = require('../middleware/auth');
const { uploadProductImages } = require('../middleware/upload');

// ==========================================
// PUBLIC ROUTES (No authentication required)
// ==========================================

// Get all products with filtering and search
// GET /api/products?search=paracetamol&category=Pain Relief&medicineType=OTC&inStock=true&page=1&limit=20
router.get('/', getProducts);

// Get single product details
// GET /api/products/60f1b2b3c4d5e6f7g8h9i0j1
router.get('/:id', getProduct);

// ==========================================
// ADMIN/PHARMACIST ROUTES (Authentication required)
// ==========================================

// Get low stock products (for admin dashboard) - MUST BE BEFORE /:id route
router.get('/admin/low-stock', protect, authorize('admin', 'pharmacist'), getLowStockProducts);

// Apply authentication and authorization middleware for routes below
router.use(protect);
router.use(authorize('admin', 'pharmacist'));

// Create new product (with image upload)
// POST /api/products
router.post('/', uploadProductImages, createProduct);

// Update existing product (with image upload)
// PUT /api/products/60f1b2b3c4d5e6f7g8h9i0j1
router.put('/:id', uploadProductImages, updateProduct);

// Update product stock only
// PATCH /api/products/60f1b2b3c4d5e6f7g8h9i0j1/stock
// Body: { stock: 50 }
router.patch('/:id/stock', updateStock);

// Soft delete product (mark as discontinued)
// DELETE /api/products/60f1b2b3c4d5e6f7g8h9i0j1
router.delete('/:id', deleteProduct);

module.exports = router;