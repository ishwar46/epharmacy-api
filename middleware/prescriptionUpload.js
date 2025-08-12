const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Create uploads directory if it doesn't exist
const uploadDir = 'uploads/prescriptions';
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Storage configuration
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        // Generate unique filename: prescription_timestamp_randomstring.ext
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const fileName = `prescription_${uniqueSuffix}${path.extname(file.originalname)}`;
        cb(null, fileName);
    }
});

// File filter
const fileFilter = (req, file, cb) => {
    // Allow only image files
    const allowedTypes = /jpeg|jpg|png|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
        return cb(null, true);
    } else {
        cb(new Error('Only image files (JPEG, JPG, PNG) and PDF files are allowed'));
    }
};

// Multer configuration
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB max file size
    },
    fileFilter: fileFilter
});

// Middleware for single prescription upload
const uploadPrescription = upload.single('prescription');

// Middleware for multiple prescriptions upload
const uploadMultiplePrescriptions = upload.array('prescriptions', 5); // Max 5 files

// Error handling middleware
const handleUploadError = (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                success: false,
                message: 'File size too large. Maximum size is 5MB.'
            });
        }
        if (err.code === 'LIMIT_FILE_COUNT') {
            return res.status(400).json({
                success: false,
                message: 'Too many files. Maximum 5 prescriptions allowed.'
            });
        }
    }

    if (err.message.includes('Only image files')) {
        return res.status(400).json({
            success: false,
            message: err.message
        });
    }

    next(err);
};

// Prescription upload controller
const uploadPrescriptionFile = async (req, res, next) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No prescription file uploaded'
            });
        }

        const fileUrl = `/uploads/prescriptions/${req.file.filename}`;

        res.status(200).json({
            success: true,
            message: 'Prescription uploaded successfully',
            data: {
                fileName: req.file.filename,
                originalName: req.file.originalname,
                fileUrl: fileUrl,
                fileSize: req.file.size
            }
        });
    } catch (error) {
        next(error);
    }
};

// Multiple prescriptions upload controller
const uploadMultiplePrescriptionFiles = async (req, res, next) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No prescription files uploaded'
            });
        }

        const uploadedFiles = req.files.map(file => ({
            fileName: file.filename,
            originalName: file.originalname,
            fileUrl: `/uploads/prescriptions/${file.filename}`,
            fileSize: file.size
        }));

        res.status(200).json({
            success: true,
            message: 'Prescriptions uploaded successfully',
            data: uploadedFiles
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    uploadPrescription,
    uploadMultiplePrescriptions,
    handleUploadError,
    uploadPrescriptionFile,
    uploadMultiplePrescriptionFiles
};