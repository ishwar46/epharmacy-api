const express = require('express');
const router = express.Router();
const { getPromoBannerData } = require('../controllers/promoBannerController');

// ==========================================
// PUBLIC ROUTES (No authentication required)
// ==========================================

// Get promo banner data (slides, features, config)
// GET /api/promo-banner
router.get('/', getPromoBannerData);

module.exports = router;