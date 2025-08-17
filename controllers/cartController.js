const Cart = require('../models/Cart');
const Product = require('../models/Product');

// Helper function to transform cart data for consistent API responses
const transformCartResponse = (cart) => {
    const transformedItems = cart.items.map(item => ({
        _id: item._id,
        product: {
            _id: item.product._id,
            name: item.product.name,
            brand: item.product.brand,
            productType: item.product.productType,
            medicineType: item.product.medicineType,
            unitsPerStrip: item.product.unitsPerStrip,
            allowUnitSale: item.product.allowUnitSale,
            images: item.product.images,
            stock: item.product.stock,
            price: item.product.price
        },
        quantity: item.quantity,
        purchaseType: item.purchaseType,
        pricePerItem: item.pricePerItem,
        totalPrice: item.totalPrice,
        addedAt: item.addedAt
    }));

    return {
        _id: cart._id,
        items: transformedItems,
        subtotal: cart.subtotal,
        totalItems: cart.totalItems,
        isEmpty: cart.items.length === 0,
        expiresAt: cart.expiresAt
    };
};

// Helper function to get or create cart
const getOrCreateCart = async (userId = null, guestId = null) => {
    // Prioritize user ID over guest ID
    let cart;

    if (userId) {
        // Look for cart by user ID first
        cart = await Cart.findOne({
            user: userId,
            status: 'active'
        }).populate('items.product');
    } else if (guestId) {
        // Look for cart by guest ID only if no user
        cart = await Cart.findOne({
            guestId: guestId,
            status: 'active',
            user: null
        }).populate('items.product');
    }

    if (!cart) {
        cart = new Cart({
            user: userId,
            guestId: userId ? null : guestId  // Only set guestId if no user
        });
        await cart.save();
    }

    return cart;
};

// Helper function to calculate pricing based on purchase type
const calculatePricing = (product, purchaseType, quantity) => {
    let pricePerItem;
    let stockNeeded;

    if (purchaseType === 'unit' && (product.productType === 'tablet' || product.productType === 'capsule')) {
        // Buying individual tablets/capsules
        if (!product.allowUnitSale) {
            throw new Error('This product cannot be sold as individual units');
        }
        pricePerItem = product.price / (product.unitsPerStrip || 10);
        stockNeeded = Math.ceil(quantity / (product.unitsPerStrip || 10)); // Strips needed
    } else {
        // Buying packages (strips, bottles, etc.)
        pricePerItem = product.price;
        stockNeeded = quantity;
    }

    return {
        pricePerItem: parseFloat(pricePerItem.toFixed(2)),
        stockNeeded
    };
};

// @desc    Get user's cart
// @route   GET /api/cart
// @access  Public (supports both authenticated and guest users)
exports.getCart = async (req, res, next) => {
    try {
        const userId = req.user?.id || null;
        const guestId = req.headers['x-guest-id'] || req.query.guestId || null;

        if (!userId && !guestId) {
            return res.status(400).json({
                success: false,
                message: 'User ID or Guest ID required'
            });
        }

        let cart;

        // Prioritize user ID over guest ID for cart lookup
        if (userId) {
            cart = await Cart.findOne({
                user: userId,
                status: 'active'
            }).populate('items.product');
        } else if (guestId) {
            cart = await Cart.findOne({
                guestId: guestId,
                status: 'active',
                user: null
            }).populate('items.product');
        }

        if (!cart) {
            // Return empty cart structure
            return res.status(200).json({
                success: true,
                data: {
                    items: [],
                    subtotal: 0,
                    totalItems: 0,
                    isEmpty: true
                }
            });
        }

        // Check if cart has expired
        if (cart.isExpired) {
            return res.status(200).json({
                success: true,
                data: {
                    items: [],
                    subtotal: 0,
                    totalItems: 0,
                    isEmpty: true,
                    expired: true
                }
            });
        }

        // Extend cart expiration since user is active
        cart.extendExpiration();
        await cart.save();

        res.status(200).json({
            success: true,
            data: transformCartResponse(cart)
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Add item to cart
// @route   POST /api/cart/add
// @access  Public
exports.addToCart = async (req, res, next) => {
    try {
        const { productId, quantity, purchaseType = 'package' } = req.body;
        const userId = req.user?.id || null;
        const guestId = req.headers['x-guest-id'] || req.body.guestId || null;

        // Validation
        if (!productId || !quantity || quantity < 1) {
            return res.status(400).json({
                success: false,
                message: 'Product ID and valid quantity are required'
            });
        }

        if (!['unit', 'package'].includes(purchaseType)) {
            return res.status(400).json({
                success: false,
                message: 'Purchase type must be either "unit" or "package"'
            });
        }

        if (!userId && !guestId) {
            return res.status(400).json({
                success: false,
                message: 'User ID or Guest ID required'
            });
        }

        // Get product
        const product = await Product.findById(productId);
        if (!product || product.status !== 'active') {
            return res.status(404).json({
                success: false,
                message: 'Product not found or inactive'
            });
        }

        // Validate minimum purchase quantity
        if (quantity < product.minOrderQuantity) {
            return res.status(400).json({
                success: false,
                message: `Minimum order quantity is ${product.minOrderQuantity} ${purchaseType === 'unit' ? 'units' : 'packages'}`
            });
        }

        // Validate maximum purchase quantity (if set)
        if (product.maxOrderQuantity && quantity > product.maxOrderQuantity) {
            return res.status(400).json({
                success: false,
                message: `Maximum order quantity is ${product.maxOrderQuantity} ${purchaseType === 'unit' ? 'units' : 'packages'}`
            });
        }

        // Validate purchase type for product - STRICT enforcement
        if (purchaseType === 'unit') {
            if (!['tablet', 'capsule'].includes(product.productType)) {
                return res.status(400).json({
                    success: false,
                    message: `Only tablets and capsules can be sold as individual units. ${product.productType}s are only available as complete packages.`
                });
            }
            if (!product.allowUnitSale) {
                return res.status(400).json({
                    success: false,
                    message: `This ${product.productType} is not available for individual unit purchase. Only complete packages are available.`
                });
            }
        }

        // Calculate pricing and stock needed
        const { pricePerItem, stockNeeded } = calculatePricing(product, purchaseType, quantity);

        // Check stock availability
        const availableStock = product.stock - (product.reservedStock || 0);
        if (availableStock < stockNeeded) {
            return res.status(400).json({
                success: false,
                message: `Insufficient stock. Available: ${availableStock}, Required: ${stockNeeded}`
            });
        }

        // Get or create cart
        const cart = await getOrCreateCart(userId, guestId);

        // Reserve stock first, then update cart
        await product.reserveStock(stockNeeded);

        try {
            // Add item to cart (this now waits properly)
            await cart.addItem(productId, quantity, purchaseType, pricePerItem);

            // Get updated cart with populated products
            const updatedCart = await Cart.findById(cart._id).populate('items.product');

            res.status(200).json({
                success: true,
                message: 'Item added to cart successfully',
                data: transformCartResponse(updatedCart)
            });
        } catch (cartError) {
            // If cart update fails, release the reserved stock
            await product.releaseReservedStock(stockNeeded);
            throw cartError;
        }
    } catch (error) {
        console.error('Add to cart error:', error);
        next(error);
    }
};

// @desc    Update cart item quantity
// @route   PUT /api/cart/update
// @access  Public
exports.updateCartItem = async (req, res, next) => {
    try {
        const { productId, purchaseType, quantity } = req.body;
        const userId = req.user?.id || null;
        const guestId = req.headers['x-guest-id'] || req.body.guestId || null;

        // Validation
        if (!productId || !purchaseType || quantity < 0) {
            return res.status(400).json({
                success: false,
                message: 'Product ID, purchase type, and valid quantity are required'
            });
        }

        const cart = await Cart.findActiveCart(userId, guestId);
        if (!cart) {
            return res.status(404).json({
                success: false,
                message: 'Cart not found'
            });
        }

        // Get product for stock calculations
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        // Find current cart item
        const currentItem = cart.items.find(
            item => (item.product._id || item.product).toString() === productId && item.purchaseType === purchaseType
        );

        if (!currentItem) {
            return res.status(404).json({
                success: false,
                message: 'Item not found in cart'
            });
        }

        // Validate purchase type for product - STRICT enforcement
        if (purchaseType === 'unit') {
            if (!['tablet', 'capsule'].includes(product.productType)) {
                return res.status(400).json({
                    success: false,
                    message: `Only tablets and capsules can be sold as individual units. ${product.productType}s are only available as complete packages.`
                });
            }
            if (!product.allowUnitSale) {
                return res.status(400).json({
                    success: false,
                    message: `This ${product.productType} is not available for individual unit purchase. Only complete packages are available.`
                });
            }
        }

        if (quantity === 0) {
            // Remove item completely
            const { cart: updatedCart, removedItem } = await cart.removeItem(productId, purchaseType);

            // Release reserved stock
            const { stockNeeded } = calculatePricing(product, purchaseType, removedItem.quantity);
            await product.releaseReservedStock(stockNeeded);

            const finalCart = await Cart.findById(updatedCart._id).populate('items.product');

            return res.status(200).json({
                success: true,
                message: 'Item removed from cart',
                data: transformCartResponse(finalCart)
            });
        }

        // Validate minimum purchase quantity for updates
        if (quantity < product.minOrderQuantity) {
            return res.status(400).json({
                success: false,
                message: `Minimum order quantity is ${product.minOrderQuantity} ${purchaseType === 'unit' ? 'units' : 'packages'}`
            });
        }

        // Validate maximum purchase quantity (if set)
        if (product.maxOrderQuantity && quantity > product.maxOrderQuantity) {
            return res.status(400).json({
                success: false,
                message: `Maximum order quantity is ${product.maxOrderQuantity} ${purchaseType === 'unit' ? 'units' : 'packages'}`
            });
        }

        // Calculate new stock needed
        const { stockNeeded: newStockNeeded } = calculatePricing(product, purchaseType, quantity);
        const { stockNeeded: currentStockNeeded } = calculatePricing(product, purchaseType, currentItem.quantity);
        const stockDifference = newStockNeeded - currentStockNeeded;

        // Check if we need more stock
        if (stockDifference > 0) {
            const availableStock = product.stock - (product.reservedStock || 0);
            if (availableStock < stockDifference) {
                return res.status(400).json({
                    success: false,
                    message: `Insufficient stock. Available: ${availableStock}, Required: ${stockDifference}`
                });
            }

            // Reserve additional stock
            await product.reserveStock(stockDifference);
        } else if (stockDifference < 0) {
            // Release excess stock
            await product.releaseReservedStock(Math.abs(stockDifference));
        }

        // Update cart item
        await cart.updateItemQuantity(productId, purchaseType, quantity);

        const updatedCart = await Cart.findById(cart._id).populate('items.product');

        res.status(200).json({
            success: true,
            message: 'Cart updated successfully',
            data: transformCartResponse(updatedCart)
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Remove item from cart
// @route   DELETE /api/cart/remove
// @access  Public
exports.removeFromCart = async (req, res, next) => {
    try {
        const { productId, purchaseType } = req.body;
        const userId = req.user?.id || null;
        const guestId = req.headers['x-guest-id'] || req.body.guestId || null;

        const cart = await Cart.findActiveCart(userId, guestId);
        if (!cart) {
            return res.status(404).json({
                success: false,
                message: 'Cart not found'
            });
        }

        const { cart: updatedCart, removedItem } = await cart.removeItem(productId, purchaseType);

        // Release reserved stock
        if (removedItem.reservedStock > 0) {
            const product = await Product.findById(productId);
            if (product) {
                await product.releaseReservedStock(removedItem.reservedStock);
            }
        }

        const finalCart = await Cart.findById(updatedCart._id).populate('items.product');

        res.status(200).json({
            success: true,
            message: 'Item removed from cart',
            data: transformCartResponse(finalCart)
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Clear entire cart
// @route   DELETE /api/cart/clear
// @access  Public
exports.clearCart = async (req, res, next) => {
    try {
        const userId = req.user?.id || null;
        const guestId = req.headers['x-guest-id'] || req.body.guestId || null;

        const cart = await Cart.findActiveCart(userId, guestId);
        if (!cart) {
            return res.status(404).json({
                success: false,
                message: 'Cart not found'
            });
        }

        const { cart: updatedCart, removedItems } = await cart.clearCart();

        // Release all reserved stock
        for (const item of removedItems) {
            if (item.reservedStock > 0) {
                const product = await Product.findById(item.product);
                if (product) {
                    await product.releaseReservedStock(item.reservedStock);
                }
            }
        }

        res.status(200).json({
            success: true,
            message: 'Cart cleared successfully',
            data: {
                items: [],
                subtotal: 0,
                totalItems: 0,
                isEmpty: true
            }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Check product availability for cart
// @route   POST /api/cart/check-availability
// @access  Public
exports.checkAvailability = async (req, res, next) => {
    try {
        const { productId, quantity, purchaseType = 'package' } = req.body;

        const product = await Product.findById(productId);
        if (!product || product.status !== 'active') {
            return res.status(404).json({
                success: false,
                message: 'Product not found or inactive'
            });
        }

        // Validate purchase type for product - STRICT enforcement
        if (purchaseType === 'unit') {
            if (!['tablet', 'capsule'].includes(product.productType)) {
                return res.status(400).json({
                    success: false,
                    message: `Only tablets and capsules can be sold as individual units. ${product.productType}s are only available as complete packages.`
                });
            }
            if (!product.allowUnitSale) {
                return res.status(400).json({
                    success: false,
                    message: `This ${product.productType} is not available for individual unit purchase. Only complete packages are available.`
                });
            }
        }

        // Check quantity constraints
        const minQtyValid = quantity >= product.minOrderQuantity;
        const maxQtyValid = !product.maxOrderQuantity || quantity <= product.maxOrderQuantity;

        const { pricePerItem, stockNeeded } = calculatePricing(product, purchaseType, quantity);
        const availableStock = product.stock - (product.reservedStock || 0);

        const stockAvailable = availableStock >= stockNeeded;
        const isAvailable = minQtyValid && maxQtyValid && stockAvailable;

        // Build validation messages
        const validationMessages = [];
        if (!minQtyValid) {
            validationMessages.push(`Minimum order quantity is ${product.minOrderQuantity}`);
        }
        if (!maxQtyValid) {
            validationMessages.push(`Maximum order quantity is ${product.maxOrderQuantity}`);
        }
        if (!stockAvailable) {
            validationMessages.push(`Insufficient stock. Available: ${availableStock}`);
        }

        res.status(200).json({
            success: true,
            data: {
                available: isAvailable,
                pricePerItem,
                totalPrice: pricePerItem * quantity,
                stockNeeded,
                availableStock,
                validationMessages,
                constraints: {
                    minOrderQuantity: product.minOrderQuantity,
                    maxOrderQuantity: product.maxOrderQuantity
                },
                product: {
                    name: product.name,
                    productType: product.productType,
                    allowUnitSale: product.allowUnitSale
                }
            }
        });
    } catch (error) {
        next(error);
    }
};