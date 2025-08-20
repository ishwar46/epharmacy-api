const express = require('express');
const { getHeroBannerData } = require('../controllers/heroBannerController');

const router = express.Router();

// Public route - Get hero banner data for frontend
router.get('/', getHeroBannerData);

module.exports = router;