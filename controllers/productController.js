const Product = require('../models/Product');
const messages = require('../config/messages');

// @desc    Get all products with search & filter functionality
// @route   GET /api/products
// @access  Public
exports.getProducts = async (req, res, next) => {
    try {
        const query = {};

        // Search by product name or description (case-insensitive)
        if (req.query.search) {
            query.$or = [
                { name: { $regex: req.query.search, $options: 'i' } },
                { description: { $regex: req.query.search, $options: 'i' } }
            ];
        }

        // Filter by category
        if (req.query.category) {
            query.category = req.query.category;
        }

        // Filter by price range
        if (req.query.minPrice || req.query.maxPrice) {
            query.price = {};
            if (req.query.minPrice) {
                query.price.$gte = Number(req.query.minPrice);
            }
            if (req.query.maxPrice) {
                query.price.$lte = Number(req.query.maxPrice);
            }
        }

        // Filter by medicine type (OTC or Prescription)
        if (req.query.medicineType) {
            query.medicineType = req.query.medicineType;
        }

        const products = await Product.find(query);
        res.status(200).json({
            success: true,
            count: products.length,
            data: products
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get a single product's details
// @route   GET /api/products/:id
// @access  Public
exports.getProduct = async (req, res, next) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) {
            return res.status(404).json({ success: false, message: messages.errors.productNotFound });
        }
        res.status(200).json({ success: true, data: product });
    } catch (error) {
        next(error);
    }
};

// @desc    Create a new product (Admin only)
// @route   POST /api/products
// @access  Private/Admin
exports.createProduct = async (req, res, next) => {
    try {
        const product = await Product.create(req.body);
        res.status(201).json({
            success: true,
            message: messages.success.productAdded,
            data: product
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Update an existing product (Admin only)
// @route   PUT /api/products/:id
// @access  Private/Admin
exports.updateProduct = async (req, res, next) => {
    try {
        const product = await Product.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true
        });
        if (!product) {
            return res.status(404).json({ success: false, message: messages.errors.productNotFound });
        }
        res.status(200).json({
            success: true,
            message: messages.success.productUpdated,
            data: product
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Delete a product (Admin only)
// @route   DELETE /api/products/:id
// @access  Private/Admin
exports.deleteProduct = async (req, res, next) => {
    try {
        const product = await Product.findByIdAndDelete(req.params.id);
        if (!product) {
            return res.status(404).json({ success: false, message: messages.errors.productNotFound });
        }
        res.status(200).json({ success: true, message: messages.success.productDeleted });
    } catch (error) {
        next(error);
    }
};
