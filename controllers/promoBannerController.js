const { PromoSlide, PromoFeature, PromoBannerConfig } = require('../models/PromoBanner');

// Get all slides with features and config (Public endpoint)
const getPromoBannerData = async (req, res) => {
  try {
    const [slides, features, config] = await Promise.all([
      PromoSlide.find({ isActive: true }).sort({ order: 1 }),
      PromoFeature.find({ isActive: true }).sort({ order: 1 }),
      PromoBannerConfig.findOne({ isActive: true })
    ]);

    // If no config exists, create default
    let bannerConfig = config;
    if (!bannerConfig) {
      bannerConfig = await PromoBannerConfig.create({});
    }

    res.json({
      success: true,
      data: {
        slides,
        features,
        config: bannerConfig
      }
    });
  } catch (error) {
    console.error('Get promo banner data error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch promo banner data'
    });
  }
};

// ADMIN ENDPOINTS

// Get all slides (Admin)
const getAllSlides = async (req, res) => {
  try {
    const slides = await PromoSlide.find().sort({ order: 1 });
    res.json({
      success: true,
      data: slides
    });
  } catch (error) {
    console.error('Get all slides error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch slides'
    });
  }
};

// Create slide (Admin)
const createSlide = async (req, res) => {
  try {
    const { 
      badgeIcon, badgeText, title, description, primaryCta, secondaryCta, 
      bgGradient, badgeClass, accentEmoji, footNote, order 
    } = req.body;

    const slide = new PromoSlide({
      badgeIcon,
      badgeText,
      title,
      description,
      primaryCta,
      secondaryCta,
      bgGradient: bgGradient || 'from-purple-700 to-purple-900',
      badgeClass: badgeClass || 'bg-amber-300 text-purple-900',
      accentEmoji: accentEmoji || '💊',
      footNote,
      order: order || 0
    });

    await slide.save();

    res.status(201).json({
      success: true,
      message: 'Slide created successfully',
      data: slide
    });
  } catch (error) {
    console.error('Create slide error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create slide',
      error: error.message
    });
  }
};

// Update slide (Admin)
const updateSlide = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const slide = await PromoSlide.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!slide) {
      return res.status(404).json({
        success: false,
        message: 'Slide not found'
      });
    }

    res.json({
      success: true,
      message: 'Slide updated successfully',
      data: slide
    });
  } catch (error) {
    console.error('Update slide error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update slide',
      error: error.message
    });
  }
};

// Delete slide (Admin)
const deleteSlide = async (req, res) => {
  try {
    const { id } = req.params;

    const slide = await PromoSlide.findByIdAndDelete(id);

    if (!slide) {
      return res.status(404).json({
        success: false,
        message: 'Slide not found'
      });
    }

    res.json({
      success: true,
      message: 'Slide deleted successfully'
    });
  } catch (error) {
    console.error('Delete slide error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete slide'
    });
  }
};

// Get all features (Admin)
const getAllFeatures = async (req, res) => {
  try {
    const features = await PromoFeature.find().sort({ order: 1 });
    res.json({
      success: true,
      data: features
    });
  } catch (error) {
    console.error('Get all features error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch features'
    });
  }
};

// Create feature (Admin)
const createFeature = async (req, res) => {
  try {
    const { title, subtitle, description, icon, bgColor, ctaText, ctaAction, order } = req.body;

    const feature = new PromoFeature({
      title,
      subtitle,
      description,
      icon,
      bgColor,
      ctaText,
      ctaAction,
      order: order || 0
    });

    await feature.save();

    res.status(201).json({
      success: true,
      message: 'Feature created successfully',
      data: feature
    });
  } catch (error) {
    console.error('Create feature error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create feature',
      error: error.message
    });
  }
};

// Update feature (Admin)
const updateFeature = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const feature = await PromoFeature.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!feature) {
      return res.status(404).json({
        success: false,
        message: 'Feature not found'
      });
    }

    res.json({
      success: true,
      message: 'Feature updated successfully',
      data: feature
    });
  } catch (error) {
    console.error('Update feature error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update feature',
      error: error.message
    });
  }
};

// Delete feature (Admin)
const deleteFeature = async (req, res) => {
  try {
    const { id } = req.params;

    const feature = await PromoFeature.findByIdAndDelete(id);

    if (!feature) {
      return res.status(404).json({
        success: false,
        message: 'Feature not found'
      });
    }

    res.json({
      success: true,
      message: 'Feature deleted successfully'
    });
  } catch (error) {
    console.error('Delete feature error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete feature'
    });
  }
};

// Get config (Admin)
const getConfig = async (req, res) => {
  try {
    let config = await PromoBannerConfig.findOne({ isActive: true });

    if (!config) {
      config = await PromoBannerConfig.create({});
    }

    res.json({
      success: true,
      data: config
    });
  } catch (error) {
    console.error('Get config error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch config'
    });
  }
};

// Update config (Admin)
const updateConfig = async (req, res) => {
  try {
    const updateData = req.body;

    let config = await PromoBannerConfig.findOne({ isActive: true });

    if (!config) {
      config = await PromoBannerConfig.create(updateData);
    } else {
      config = await PromoBannerConfig.findByIdAndUpdate(
        config._id,
        updateData,
        { new: true, runValidators: true }
      );
    }

    res.json({
      success: true,
      message: 'Configuration updated successfully',
      data: config
    });
  } catch (error) {
    console.error('Update config error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update configuration',
      error: error.message
    });
  }
};

// Reorder slides (Admin)
const reorderSlides = async (req, res) => {
  try {
    const { slideOrders } = req.body; // Array of {id, order}

    const updatePromises = slideOrders.map(({ id, order }) =>
      PromoSlide.findByIdAndUpdate(id, { order }, { new: true })
    );

    await Promise.all(updatePromises);

    res.json({
      success: true,
      message: 'Slides reordered successfully'
    });
  } catch (error) {
    console.error('Reorder slides error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reorder slides'
    });
  }
};

// Reorder features (Admin)
const reorderFeatures = async (req, res) => {
  try {
    const { featureOrders } = req.body; // Array of {id, order}

    const updatePromises = featureOrders.map(({ id, order }) =>
      PromoFeature.findByIdAndUpdate(id, { order }, { new: true })
    );

    await Promise.all(updatePromises);

    res.json({
      success: true,
      message: 'Features reordered successfully'
    });
  } catch (error) {
    console.error('Reorder features error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reorder features'
    });
  }
};

module.exports = {
  // Public endpoints
  getPromoBannerData,

  // Admin slide endpoints
  getAllSlides,
  createSlide,
  updateSlide,
  deleteSlide,
  reorderSlides,

  // Admin feature endpoints
  getAllFeatures,
  createFeature,
  updateFeature,
  deleteFeature,
  reorderFeatures,

  // Admin config endpoints
  getConfig,
  updateConfig
};