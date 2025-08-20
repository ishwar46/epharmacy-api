const { PromoSlide, PromoFeature, PromoBannerConfig } = require('../models/PromoBanner');

const seedPromoSlides = [
  {
    badgeIcon: "Percent",
    badgeText: "Special Offer",
    title: "Get Up to 20% Off",
    description: "On your first order of prescription medicines. Upload your prescription and save on authentic medications.",
    primaryCta: {
      label: "Upload Prescription",
      link: "/prescriptions"
    },
    secondaryCta: {
      label: "Browse Medicines",
      link: "/"
    },
    bgGradient: "from-purple-700 to-purple-900",
    badgeClass: "bg-amber-300 text-purple-900",
    accentEmoji: "💊",
    footNote: "Trusted by 1000+ customers",
    order: 0,
    isActive: true
  },
  {
    badgeIcon: "Truck",
    badgeText: "Free Delivery",
    title: "Free Delivery in Biratnagar",
    description: "Enjoy free doorstep delivery on orders above Rs. 500. Fast, safe, and reliable.",
    primaryCta: {
      label: "Shop Now",
      link: "/"
    },
    secondaryCta: {
      label: "Learn More",
      link: "/about"
    },
    bgGradient: "from-emerald-700 to-emerald-800",
    badgeClass: "bg-emerald-200 text-emerald-900",
    accentEmoji: "🚚",
    footNote: "Order tracking available",
    order: 1,
    isActive: true
  },
  {
    badgeIcon: "Shield",
    badgeText: "Licensed Pharmacy",
    title: "100% Authentic Medicines",
    description: "We're a certified pharmacy. Genuine products with proper cold-chain handling where required.",
    primaryCta: {
      label: "View Certificates",
      link: "/about"
    },
    secondaryCta: {
      label: "Browse Medicines",
      link: "/"
    },
    bgGradient: "from-sky-700 to-indigo-800",
    badgeClass: "bg-sky-200 text-sky-900",
    accentEmoji: "🧪",
    footNote: "Quality checked & verified",
    order: 2,
    isActive: true
  }
];

const seedPromoFeatures = [
  {
    title: "Free Delivery",
    subtitle: "On orders above Rs. 500",
    description: "Get your medicines delivered free across Biratnagar",
    icon: "Truck",
    bgColor: "from-slate-800 to-slate-900",
    ctaText: "Shop Now",
    ctaAction: "/",
    order: 0,
    isActive: true
  },
  {
    title: "24/7 Emergency",
    subtitle: "Urgent medicine delivery",
    description: "Emergency medicines available round the clock",
    icon: "Clock",
    bgColor: "from-zinc-800 to-zinc-900",
    ctaText: "Call Now",
    ctaAction: "tel:+977-1-4445566",
    order: 1,
    isActive: true
  },
  {
    title: "Licensed Pharmacy",
    subtitle: "100% Authentic medicines",
    description: "Certified pharmacy with genuine products",
    icon: "Shield",
    bgColor: "from-slate-800 to-slate-900",
    ctaText: "Learn More",
    ctaAction: "/about",
    order: 2,
    isActive: true
  }
];

const seedPromoBannerConfig = {
  autoplayMs: 5500,
  showArrows: true,
  showDots: true,
  enableTouch: true,
  isActive: true
};

const seedPromoBannerData = async () => {
  try {
    console.log('🌱 Starting Promo Banner seeding...');

    // Clear existing data
    await PromoSlide.deleteMany({});
    await PromoFeature.deleteMany({});
    await PromoBannerConfig.deleteMany({});

    // Insert slides
    const createdSlides = await PromoSlide.insertMany(seedPromoSlides);
    console.log(`✅ Created ${createdSlides.length} promo slides`);

    // Insert features
    const createdFeatures = await PromoFeature.insertMany(seedPromoFeatures);
    console.log(`✅ Created ${createdFeatures.length} promo features`);

    // Insert config
    const createdConfig = await PromoBannerConfig.create(seedPromoBannerConfig);
    console.log(`✅ Created promo banner configuration`);

    console.log('🎉 Promo Banner seeding completed successfully!');

    return {
      slides: createdSlides,
      features: createdFeatures,
      config: createdConfig
    };

  } catch (error) {
    console.error('❌ Error seeding promo banner data:', error);
    throw error;
  }
};

module.exports = { seedPromoBannerData };