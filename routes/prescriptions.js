const express = require('express');
const router = express.Router();

const {
    uploadPrescription,
    uploadMultiplePrescriptions,
    handleUploadError,
    uploadPrescriptionFile,
    uploadMultiplePrescriptionFiles
} = require('../middleware/prescriptionUpload');

// ==========================================
// PRESCRIPTION UPLOAD ROUTES
// ==========================================

// Upload single prescription
// POST /api/prescriptions/upload
// Form data: prescription (file)
router.post('/upload', uploadPrescription, handleUploadError, uploadPrescriptionFile);

// Upload multiple prescriptions
// POST /api/prescriptions/upload-multiple
// Form data: prescriptions[] (files)
router.post('/upload-multiple', uploadMultiplePrescriptions, handleUploadError, uploadMultiplePrescriptionFiles);

module.exports = router;