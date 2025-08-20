const { HeroBannerSlide, HeroBannerFeature, HeroBannerConfig } = require('../models/HeroBanner');

// Get all slides with features and config (Public endpoint)
const getHeroBannerData = async (req, res) => {
  try {
    const [slides, features, config] = await Promise.all([
      HeroBannerSlide.find({ isActive: true }).sort({ order: 1 }),
      HeroBannerFeature.find({ isActive: true }).sort({ order: 1 }),
      HeroBannerConfig.findOne({ isActive: true })
    ]);

    // If no config exists, create default
    let bannerConfig = config;
    if (!bannerConfig) {
      bannerConfig = await HeroBannerConfig.create({});
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
    console.error('Get hero banner data error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch hero banner data'
    });
  }
};

// ADMIN ENDPOINTS

// Get all slides (Admin)
const getAllSlides = async (req, res) => {
  try {
    const slides = await HeroBannerSlide.find().sort({ order: 1 });
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
    const { title, subtitle, description, image, ctaText, ctaLink, bgGradient, order } = req.body;

    const slide = new HeroBannerSlide({
      title,
      subtitle,
      description,
      image,
      ctaText,
      ctaLink,
      bgGradient: bgGradient || 'from-blue-600 to-blue-800',
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

    const slide = await HeroBannerSlide.findByIdAndUpdate(
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

    const slide = await HeroBannerSlide.findByIdAndDelete(id);

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
    const features = await HeroBannerFeature.find().sort({ order: 1 });
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
    const { title, description, icon, order } = req.body;

    const feature = new HeroBannerFeature({
      title,
      description,
      icon,
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

    const feature = await HeroBannerFeature.findByIdAndUpdate(
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

    const feature = await HeroBannerFeature.findByIdAndDelete(id);

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
    let config = await HeroBannerConfig.findOne({ isActive: true });

    if (!config) {
      config = await HeroBannerConfig.create({});
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

    let config = await HeroBannerConfig.findOne({ isActive: true });

    if (!config) {
      config = await HeroBannerConfig.create(updateData);
    } else {
      config = await HeroBannerConfig.findByIdAndUpdate(
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
      HeroBannerSlide.findByIdAndUpdate(id, { order }, { new: true })
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
      HeroBannerFeature.findByIdAndUpdate(id, { order }, { new: true })
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
  getHeroBannerData,

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