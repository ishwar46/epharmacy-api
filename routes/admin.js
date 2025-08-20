// routes/admin.js
const express = require('express');
const router = express.Router();
const {
    getUserPlainPassword,
    getAllUsers,
    createUserByAdmin,
    updateUserByAdmin,
    deleteUserByAdmin
} = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/auth');


// Get all users
router.get('/users', protect, authorize('admin'), getAllUsers);

// Create user by admin
router.post('/users', protect, authorize('admin'), createUserByAdmin);

// Update user by admin
router.put('/users/:userId', protect, authorize('admin'), updateUserByAdmin);

// Delete user by admin
router.delete('/users/:userId', protect, authorize('admin'), deleteUserByAdmin);

// Hero Banner Management Routes
const {
  getAllSlides,
  createSlide,
  updateSlide,
  deleteSlide,
  reorderSlides,
  getAllFeatures,
  createFeature,
  updateFeature,
  deleteFeature,
  reorderFeatures,
  getConfig,
  updateConfig
} = require('../controllers/heroBannerController');

// Hero Banner - Slides management
router.get('/hero-banner/slides', protect, authorize('admin'), getAllSlides);
router.post('/hero-banner/slides', protect, authorize('admin'), createSlide);
router.put('/hero-banner/slides/:id', protect, authorize('admin'), updateSlide);
router.delete('/hero-banner/slides/:id', protect, authorize('admin'), deleteSlide);
router.post('/hero-banner/slides/reorder', protect, authorize('admin'), reorderSlides);

// Hero Banner - Features management
router.get('/hero-banner/features', protect, authorize('admin'), getAllFeatures);
router.post('/hero-banner/features', protect, authorize('admin'), createFeature);
router.put('/hero-banner/features/:id', protect, authorize('admin'), updateFeature);
router.delete('/hero-banner/features/:id', protect, authorize('admin'), deleteFeature);
router.post('/hero-banner/features/reorder', protect, authorize('admin'), reorderFeatures);

// Hero Banner - Configuration management
router.get('/hero-banner/config', protect, authorize('admin'), getConfig);
router.put('/hero-banner/config', protect, authorize('admin'), updateConfig);

// Promo Banner Management Routes
const {
  getAllSlides: getAllPromoSlides,
  createSlide: createPromoSlide,
  updateSlide: updatePromoSlide,
  deleteSlide: deletePromoSlide,
  reorderSlides: reorderPromoSlides,
  getAllFeatures: getAllPromoFeatures,
  createFeature: createPromoFeature,
  updateFeature: updatePromoFeature,
  deleteFeature: deletePromoFeature,
  reorderFeatures: reorderPromoFeatures,
  getConfig: getPromoConfig,
  updateConfig: updatePromoConfig
} = require('../controllers/promoBannerController');

// Promo Banner - Slides management
router.get('/promo-banner/slides', protect, authorize('admin'), getAllPromoSlides);
router.post('/promo-banner/slides', protect, authorize('admin'), createPromoSlide);
router.put('/promo-banner/slides/:id', protect, authorize('admin'), updatePromoSlide);
router.delete('/promo-banner/slides/:id', protect, authorize('admin'), deletePromoSlide);
router.post('/promo-banner/slides/reorder', protect, authorize('admin'), reorderPromoSlides);

// Promo Banner - Features management
router.get('/promo-banner/features', protect, authorize('admin'), getAllPromoFeatures);
router.post('/promo-banner/features', protect, authorize('admin'), createPromoFeature);
router.put('/promo-banner/features/:id', protect, authorize('admin'), updatePromoFeature);
router.delete('/promo-banner/features/:id', protect, authorize('admin'), deletePromoFeature);
router.post('/promo-banner/features/reorder', protect, authorize('admin'), reorderPromoFeatures);

// Promo Banner - Configuration management
router.get('/promo-banner/config', protect, authorize('admin'), getPromoConfig);
router.put('/promo-banner/config', protect, authorize('admin'), updatePromoConfig);

module.exports = router;
