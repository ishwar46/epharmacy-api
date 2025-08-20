const { HeroBannerSlide, HeroBannerFeature, HeroBannerConfig } = require('../models/HeroBanner');

const seedHeroBanner = async () => {
  try {
    // Clear existing data
    await Promise.all([
      HeroBannerSlide.deleteMany({}),
      HeroBannerFeature.deleteMany({}),
      HeroBannerConfig.deleteMany({})
    ]);

    // Seed slides
    const slides = [
      {
        title: "Authentic Medicines",
        subtitle: "Licensed & Trusted",
        description: "Get 100% authentic medicines delivered to your doorstep with our licensed pharmacy in Biratnagar, Nepal.",
        image: "https://images.unsplash.com/photo-1631549916768-4119b2e5f926?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80",
        ctaText: "Shop Now",
        ctaLink: "#products",
        bgGradient: "from-blue-600 to-blue-800",
        order: 0,
        isActive: true
      },
      {
        title: "Fast Delivery",
        subtitle: "24/7 Service",
        description: "Quick and reliable medicine delivery across Biratnagar. Emergency medicines available round the clock.",
        image: "https://plus.unsplash.com/premium_vector-1723106617732-1b7c98fd6b25?q=80&w=1160&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
        ctaText: "Order Now",
        ctaLink: "#products",
        bgGradient: "from-green-600 to-green-800",
        order: 1,
        isActive: true
      },
      {
        title: "Prescription Care",
        subtitle: "Expert Guidance",
        description: "Upload your prescription and get expert consultation. Safe, secure, and confidential medicine ordering.",
        image: "https://plus.unsplash.com/premium_vector-1682269321090-17424d99942d?q=80&w=1220&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
        ctaText: "Upload Prescription",
        ctaLink: "/prescriptions",
        bgGradient: "from-purple-600 to-purple-800",
        order: 2,
        isActive: true
      }
    ];

    // Seed features
    const features = [
      {
        title: "100% Authentic",
        description: "Licensed pharmacy with genuine medicines",
        icon: "Shield",
        order: 0,
        isActive: true
      },
      {
        title: "Fast Delivery",
        description: "Quick delivery across Biratnagar",
        icon: "Truck",
        order: 1,
        isActive: true
      },
      {
        title: "24/7 Support",
        description: "Round the clock customer service",
        icon: "Clock",
        order: 2,
        isActive: true
      }
    ];

    // Seed configuration
    const config = {
      slideDuration: 5000,
      autoplay: true,
      showArrows: true,
      showIndicators: true,
      isActive: true
    };

    // Insert data
    await Promise.all([
      HeroBannerSlide.insertMany(slides),
      HeroBannerFeature.insertMany(features),
      HeroBannerConfig.create(config)
    ]);

    console.log('✅ Hero banner data seeded successfully');
  } catch (error) {
    console.error('❌ Error seeding hero banner data:', error);
    throw error;
  }
};

module.exports = { seedHeroBanner };