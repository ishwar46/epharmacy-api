const Cart = require('../models/Cart');
const Product = require('../models/Product');
const messages = require('../config/messages');

// Get the current user's cart
exports.getCart = async (req, res, next) => {
    try {
        const cart = await Cart.findOne({ user: req.user._id }).populate('items.product');
        res.status(200).json({ success: true, data: cart });
    } catch (error) {
        next(error);
    }
};

// Add product to cart or update quantity if it exists
exports.addToCart = async (req, res, next) => {
    try {
        const { productId, quantity } = req.body;
        if (quantity < 1) {
            return res.status(400).json({ success: false, message: messages.errors.quantityInvalid });
        }

        // Validate product exists and available stock
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ success: false, message: messages.errors.productNotFound });
        }
        if (quantity > product.stock) {
            return res.status(400).json({ success: false, message: `Cannot add more than available stock (${product.stock})` });
        }

        // Find or create the user's cart
        let cart = await Cart.findOne({ user: req.user._id });
        if (!cart) {
            cart = await Cart.create({ user: req.user._id, items: [] });
        }

        const itemIndex = cart.items.findIndex(item => item.product.toString() === productId);
        if (itemIndex > -1) {
            // Update quantity if item already exists
            let newQuantity = cart.items[itemIndex].quantity + quantity;
            if (newQuantity > product.stock) {
                return res.status(400).json({ success: false, message: `Cannot add more than available stock (${product.stock})` });
            }
            cart.items[itemIndex].quantity = newQuantity;
        } else {
            cart.items.push({ product: productId, quantity });
        }

        await cart.save();
        res.status(200).json({ success: true, message: messages.success.cartUpdated, data: cart });
    } catch (error) {
        next(error);
    }
};

// Update quantity for a specific cart item
exports.updateCartItem = async (req, res, next) => {
    try {
        const { productId, quantity } = req.body;
        if (quantity < 1) {
            return res.status(400).json({ success: false, message: messages.errors.quantityInvalid });
        }

        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ success: false, message: messages.errors.productNotFound });
        }
        if (quantity > product.stock) {
            return res.status(400).json({ success: false, message: `Cannot update quantity beyond available stock (${product.stock})` });
        }

        let cart = await Cart.findOne({ user: req.user._id });
        if (!cart) {
            return res.status(404).json({ success: false, message: 'Cart not found' });
        }

        const itemIndex = cart.items.findIndex(item => item.product.toString() === productId);
        if (itemIndex === -1) {
            return res.status(404).json({ success: false, message: 'Product not in cart' });
        }

        cart.items[itemIndex].quantity = quantity;
        await cart.save();

        res.status(200).json({ success: true, message: messages.success.cartUpdated, data: cart });
    } catch (error) {
        next(error);
    }
};

// Remove an item from the cart
exports.removeCartItem = async (req, res, next) => {
    try {
        const { productId } = req.params;

        let cart = await Cart.findOne({ user: req.user._id });
        if (!cart) {
            return res.status(404).json({ success: false, message: 'Cart not found' });
        }

        cart.items = cart.items.filter(item => item.product.toString() !== productId);
        await cart.save();

        res.status(200).json({ success: true, message: messages.success.cartUpdated, data: cart });
    } catch (error) {
        next(error);
    }
};
