const mongoose = require('mongoose');

const heroBannerSlideSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  subtitle: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  image: {
    type: String,
    required: true
  },
  ctaText: {
    type: String,
    required: true,
    trim: true
  },
  ctaLink: {
    type: String,
    required: true,
    trim: true
  },
  bgGradient: {
    type: String,
    required: true,
    default: 'from-blue-600 to-blue-800'
  },
  order: {
    type: Number,
    required: true,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

const heroBannerFeatureSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  icon: {
    type: String,
    required: true,
    enum: ['Shield', 'Truck', 'Clock', 'Heart', 'Award', 'Phone', 'Mail', 'MapPin', 'Package', 'Pill', 'Stethoscope']
  },
  order: {
    type: Number,
    required: true,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

const heroBannerConfigSchema = new mongoose.Schema({
  slideDuration: {
    type: Number,
    default: 5000,
    min: 2000,
    max: 10000
  },
  autoplay: {
    type: Boolean,
    default: true
  },
  showArrows: {
    type: Boolean,
    default: true
  },
  showIndicators: {
    type: Boolean,
    default: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

const HeroBannerSlide = mongoose.model('HeroBannerSlide', heroBannerSlideSchema);
const HeroBannerFeature = mongoose.model('HeroBannerFeature', heroBannerFeatureSchema);
const HeroBannerConfig = mongoose.model('HeroBannerConfig', heroBannerConfigSchema);

module.exports = {
  HeroBannerSlide,
  HeroBannerFeature,
  HeroBannerConfig
};