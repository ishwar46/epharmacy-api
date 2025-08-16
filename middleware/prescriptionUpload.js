const { prescriptionUpload, handleUploadError } = require('../utils/multer');

// Middleware for single prescription upload
const uploadPrescription = prescriptionUpload.single('prescription');

// Middleware for multiple prescriptions upload
const uploadMultiplePrescriptions = prescriptionUpload.array('prescriptions', 5); // Max 5 files

// Note: Error handling is now imported from utils/multer.js for consistency

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