const multer = require('multer');
const { productUpload } = require('../utils/multer');

// Middleware for uploading product images
const uploadProductImages = (req, res, next) => {
    const uploadMultiple = productUpload.array('images', 5); // 'images' is the field name, max 5 files

    uploadMultiple(req, res, function (err) {
        if (err instanceof multer.MulterError) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({
                    success: false,
                    message: 'File too large. Maximum size is 10MB per image.'
                });
            }
            if (err.code === 'LIMIT_FILE_COUNT') {
                return res.status(400).json({
                    success: false,
                    message: 'Too many files. Maximum 5 images allowed.'
                });
            }
            if (err.code === 'LIMIT_UNEXPECTED_FILE') {
                return res.status(400).json({
                    success: false,
                    message: 'Unexpected field name. Use "images" as field name.'
                });
            }

            return res.status(400).json({
                success: false,
                message: 'File upload error: ' + err.message
            });
        }

        if (err) {
            return res.status(400).json({
                success: false,
                message: err.message
            });
        }

        // If no files uploaded, that's okay (images are optional)
        if (!req.files) {
            req.files = [];
        }

        console.log('Files uploaded:', req.files.map(f => f.filename)); // Debug log

        next();
    });
};

// Middleware for single image upload (if needed later)
const uploadSingleImage = (req, res, next) => {
    const uploadSingle = productUpload.single('image');

    uploadSingle(req, res, function (err) {
        if (err instanceof multer.MulterError) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({
                    success: false,
                    message: 'File too large. Maximum size is 10MB.'
                });
            }

            return res.status(400).json({
                success: false,
                message: 'File upload error: ' + err.message
            });
        }

        if (err) {
            return res.status(400).json({
                success: false,
                message: err.message
            });
        }

        next();
    });
};

module.exports = {
    uploadProductImages,
    uploadSingleImage
};