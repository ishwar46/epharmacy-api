const Product = require('../models/Product');

// @desc    Get all products
// @route   GET /api/products
// @access  Public
exports.getProducts = async (req, res, next) => {
    try {
        const {
            search,
            category,
            medicineType,
            minPrice,
            maxPrice,
            inStock,
            page = 1,
            limit = 20,
            sortBy = 'createdAt',
            sortOrder = 'desc'
        } = req.query;

        // Build query
        const query = { status: 'active' };

        // Search by name, brand, or description
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { brand: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }

        // Filter by category
        if (category) {
            query.category = category;
        }

        // Filter by medicine type
        if (medicineType) {
            query.medicineType = medicineType;
        }

        // Filter by stock availability
        if (inStock === 'true') {
            query.$expr = { $gt: [{ $subtract: ['$stock', '$reservedStock'] }, 0] };
        }

        // Price range filter
        if (minPrice || maxPrice) {
            query.price = {};
            if (minPrice) query.price.$gte = Number(minPrice);
            if (maxPrice) query.price.$lte = Number(maxPrice);
        }

        // Pagination
        const skip = (page - 1) * limit;

        // Sorting
        const sort = {};
        sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

        // Execute query
        const products = await Product.find(query)
            .sort(sort)
            .skip(skip)
            .limit(parseInt(limit));

        const total = await Product.countDocuments(query);

        // Add computed fields to response
        const transformedProducts = products.map(product => {
            const productObj = product.toObject({ virtuals: true });
            return productObj;
        });

        res.status(200).json({
            success: true,
            count: products.length,
            total,
            totalPages: Math.ceil(total / limit),
            currentPage: parseInt(page),
            data: transformedProducts
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get product categories for filter dropdown
// @route   GET /api/products/categories
// @access  Public
exports.getCategories = async (req, res, next) => {
    try {
        const categories = await Product.distinct('category', { status: 'active' });
        const medicineTypes = await Product.distinct('medicineType', { status: 'active' });

        res.status(200).json({
            success: true,
            data: {
                categories: categories.sort(),
                medicineTypes: medicineTypes.sort()
            }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get single product
// @route   GET /api/products/:id
// @access  Public
exports.getProduct = async (req, res, next) => {
    try {
        const product = await Product.findById(req.params.id);

        if (!product || product.status !== 'active') {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        const productObj = product.toObject({ virtuals: true });

        res.status(200).json({
            success: true,
            data: productObj
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Create new product
// @route   POST /api/products
// @access  Private/Admin
exports.createProduct = async (req, res, next) => {
    try {
        // Handle uploaded images
        let uploadedPaths = [];
        if (req.files && req.files.length > 0) {
            uploadedPaths = req.files.map(file => `/uploads/productImages/${file.filename}`);
        }

        const productData = {
            ...req.body,
            images: uploadedPaths
        };

        const product = await Product.create(productData);

        res.status(201).json({
            success: true,
            message: 'Product created successfully',
            data: product
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Update product
// @route   PUT /api/products/:id
// @access  Private/Admin
exports.updateProduct = async (req, res, next) => {
    try {
        let updateFields = { ...req.body };

        // Handle new image uploads
        if (req.files && req.files.length > 0) {
            const currentProduct = await Product.findById(req.params.id);
            if (currentProduct) {
                const newPaths = req.files.map(file => `/uploads/productImages/${file.filename}`);
                updateFields.images = [...(currentProduct.images || []), ...newPaths];
            }
        }

        const product = await Product.findByIdAndUpdate(
            req.params.id,
            updateFields,
            { new: true, runValidators: true }
        );

        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Product updated successfully',
            data: product
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Update product stock
// @route   PATCH /api/products/:id/stock
// @access  Private/Admin
exports.updateStock = async (req, res, next) => {
    try {
        const { stock } = req.body;

        if (stock < 0) {
            return res.status(400).json({
                success: false,
                message: 'Stock cannot be negative'
            });
        }

        const product = await Product.findByIdAndUpdate(
            req.params.id,
            { stock: stock },
            { new: true, runValidators: true }
        );

        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Stock updated successfully',
            data: product
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get low stock products
// @route   GET /api/products/admin/low-stock
// @access  Private/Admin
exports.getLowStockProducts = async (req, res, next) => {
    try {
        const products = await Product.find({
            status: 'active',
            $expr: { $lte: [{ $subtract: ['$stock', '$reservedStock'] }, 5] }
        })
            .select('name brand stock reservedStock price category stockUnit')
            .sort({ stock: 1 });

        res.status(200).json({
            success: true,
            count: products.length,
            data: products
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Delete product (soft delete)
// @route   DELETE /api/products/:id
// @access  Private/Admin
exports.deleteProduct = async (req, res, next) => {
    try {
        const product = await Product.findByIdAndUpdate(
            req.params.id,
            { status: 'discontinued' },
            { new: true }
        );

        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Product deleted successfully'
        });
    } catch (error) {
        next(error);
    }
};