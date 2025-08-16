const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

// Allowed file types
const ALLOWED_IMAGE_MIMETYPES = [
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/gif',
    'image/webp'
];

const ALLOWED_DOCUMENT_MIMETYPES = [
    'application/pdf'
];

const ALLOWED_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
const ALLOWED_DOCUMENT_EXTENSIONS = ['.pdf'];

// Create upload configuration function
const createUploadConfig = (subDir = 'general', fileSizeLimit = 2 * 1024 * 1024, allowDocuments = false) => {
    const uploadDir = path.join(__dirname, "../uploads", subDir);

    // Ensure the directory exists
    try {
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
    } catch (error) {
        console.error(`Failed to create upload directory: ${uploadDir}`, error);
        throw new Error('Upload directory creation failed');
    }

    // Set storage engine
    const storage = multer.diskStorage({
        destination: function (_req, _file, cb) {
            cb(null, uploadDir);
        },
        filename: function (_req, file, cb) {
            // Generate secure filename with UUID + timestamp
            const uniqueSuffix = crypto.randomUUID() + '-' + Date.now();
            const sanitizedOriginalName = path.basename(file.originalname).replace(/[^a-zA-Z0-9.-]/g, '');
            const ext = path.extname(sanitizedOriginalName).toLowerCase();
            
            // Validate extension based on file type
            const allowedExtensions = allowDocuments ? 
                [...ALLOWED_IMAGE_EXTENSIONS, ...ALLOWED_DOCUMENT_EXTENSIONS] : 
                ALLOWED_IMAGE_EXTENSIONS;
                
            if (!allowedExtensions.includes(ext)) {
                return cb(new Error('Invalid file extension'), null);
            }
            
            cb(null, `${uniqueSuffix}${ext}`);
        },
    });

    // Enhanced file filter
    const fileFilter = (_req, file, cb) => {
        // Define allowed types based on configuration
        const allowedMimeTypes = allowDocuments ? 
            [...ALLOWED_IMAGE_MIMETYPES, ...ALLOWED_DOCUMENT_MIMETYPES] : 
            ALLOWED_IMAGE_MIMETYPES;
            
        const allowedExtensions = allowDocuments ? 
            [...ALLOWED_IMAGE_EXTENSIONS, ...ALLOWED_DOCUMENT_EXTENSIONS] : 
            ALLOWED_IMAGE_EXTENSIONS;

        // Check MIME type
        if (!allowedMimeTypes.includes(file.mimetype.toLowerCase())) {
            const typeMessage = allowDocuments ? 
                "Invalid file type. Only JPEG, PNG, GIF, WebP images and PDF documents are allowed" :
                "Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed";
            return cb(new Error(typeMessage), false);
        }

        // Check file extension
        const ext = path.extname(file.originalname).toLowerCase();
        if (!allowedExtensions.includes(ext)) {
            return cb(new Error("Invalid file extension"), false);
        }

        // Check for suspicious patterns
        if (file.originalname.includes('..') || file.originalname.includes('/') || file.originalname.includes('\\')) {
            return cb(new Error("Invalid filename"), false);
        }

        cb(null, true);
    };

    return multer({
        storage: storage,
        limits: { 
            fileSize: fileSizeLimit,
            files: 5 // Limit number of files
        },
        fileFilter: fileFilter,
    });
};

// Pre-configured upload instances
const signatureUpload = createUploadConfig('clientSignatures', 1 * 1024 * 1024); // 1MB for signatures
const productUpload = createUploadConfig('productImages', 5 * 1024 * 1024); // 5MB for product images
const profileUpload = createUploadConfig('userProfiles', 2 * 1024 * 1024); // 2MB for user profiles
const prescriptionUpload = createUploadConfig('prescriptions', 10 * 1024 * 1024, true); // 10MB for prescriptions, allow PDFs

// Reusable error handling middleware
const handleUploadError = (err, _req, res, next) => {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                success: false,
                message: 'File size too large. Please check the size limits for this upload type.'
            });
        }
        if (err.code === 'LIMIT_FILE_COUNT') {
            return res.status(400).json({
                success: false,
                message: 'Too many files. Please check the file count limits.'
            });
        }
        if (err.code === 'LIMIT_UNEXPECTED_FILE') {
            return res.status(400).json({
                success: false,
                message: 'Unexpected field name. Please check the expected field names.'
            });
        }
        return res.status(400).json({
            success: false,
            message: 'File upload error: ' + err.message
        });
    }

    if (err && err.message) {
        return res.status(400).json({
            success: false,
            message: err.message
        });
    }

    next(err);
};

module.exports = {
    createUploadConfig,
    handleUploadError,
    signatureUpload,
    productUpload,
    profileUpload,
    prescriptionUpload,
    // Backward compatibility
    default: signatureUpload
};
