const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Create upload directory if it doesn't exist - MATCH YOUR SERVER SETUP
const uploadDir = path.join(__dirname, '../uploads/productImages');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer storage
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        // Generate unique filename: timestamp-randomnumber.extension
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const extension = path.extname(file.originalname).toLowerCase();
        cb(null, 'product-' + uniqueSuffix + extension);
    }
});

// File filter function
const fileFilter = (req, file, cb) => {
    // Check if file is an image
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Only image files are allowed!'), false);
    }
};

// Configure multer
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit per file
        files: 5 // Maximum 5 files
    },
    fileFilter: fileFilter
});

// Middleware for uploading product images
const uploadProductImages = (req, res, next) => {
    const uploadMultiple = upload.array('images', 5); // 'images' is the field name, max 5 files

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
    const uploadSingle = upload.single('image');

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