const mongoose = require('mongoose');

// Promo Slide Schema
const promoSlideSchema = new mongoose.Schema({
  badgeIcon: {
    type: String,
    required: true,
    default: 'Percent'
  },
  badgeText: {
    type: String,
    required: true,
    trim: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  primaryCta: {
    label: {
      type: String,
      required: true
    },
    link: {
      type: String,
      required: true
    }
  },
  secondaryCta: {
    label: {
      type: String,
      required: true
    },
    link: {
      type: String,
      required: true
    }
  },
  bgGradient: {
    type: String,
    required: true,
    default: 'from-purple-700 to-purple-900'
  },
  badgeClass: {
    type: String,
    required: true,
    default: 'bg-amber-300 text-purple-900'
  },
  accentEmoji: {
    type: String,
    required: true,
    default: '💊'
  },
  footNote: {
    type: String,
    required: true
  },
  order: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Promo Feature Schema (for the grid cards)
const promoFeatureSchema = new mongoose.Schema({
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
  icon: {
    type: String,
    required: true,
    default: 'Truck'
  },
  bgColor: {
    type: String,
    required: true,
    default: 'from-slate-800 to-slate-900'
  },
  ctaText: {
    type: String,
    required: true
  },
  ctaAction: {
    type: String,
    required: true
  },
  order: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Promo Banner Configuration Schema
const promoBannerConfigSchema = new mongoose.Schema({
  autoplayMs: {
    type: Number,
    default: 5500
  },
  showArrows: {
    type: Boolean,
    default: true
  },
  showDots: {
    type: Boolean,
    default: true
  },
  enableTouch: {
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

const PromoSlide = mongoose.model('PromoSlide', promoSlideSchema);
const PromoFeature = mongoose.model('PromoFeature', promoFeatureSchema);
const PromoBannerConfig = mongoose.model('PromoBannerConfig', promoBannerConfigSchema);

module.exports = {
  PromoSlide,
  PromoFeature,
  PromoBannerConfig
};