const express = require('express');
const router = express.Router();
const {
    getCart,
    addToCart,
    updateCartItem,
    removeFromCart,
    clearCart,
    checkAvailability
} = require('../controllers/cartController');

const { optionalAuth } = require('../middleware/auth');

// ==========================================
// CART ROUTES (Support both authenticated and guest users)
// ==========================================

// Get user's cart
// GET /api/cart
// Headers: x-guest-id (for guest users) or Authorization (for authenticated users)
router.get('/', optionalAuth, getCart);

// Add item to cart
// POST /api/cart/add
// Body: { productId, quantity, purchaseType: 'unit' | 'package', guestId? }
router.post('/add', optionalAuth, addToCart);

// Update cart item quantity
// PUT /api/cart/update
// Body: { productId, purchaseType, quantity, guestId? }
router.put('/update', optionalAuth, updateCartItem);

// Remove item from cart
// DELETE /api/cart/remove
// Body: { productId, purchaseType, guestId? }
router.delete('/remove', optionalAuth, removeFromCart);

// Clear entire cart
// DELETE /api/cart/clear
// Body: { guestId? }
router.delete('/clear', optionalAuth, clearCart);

// Check product availability (before adding to cart)
// POST /api/cart/check-availability
// Body: { productId, quantity, purchaseType }
router.post('/check-availability', checkAvailability);

module.exports = router;