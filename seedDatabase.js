require('dotenv').config();
const connectToDatabase = require('./database/db');
const { seedHeroBanner } = require('./seeds/heroBannerSeeds');

const runSeeds = async () => {
  try {
    console.log('🌱 Starting database seeding...');
    
    // Connect to database
    await connectToDatabase();
    console.log('✅ Connected to database');
    
    // Run seeds
    await seedHeroBanner();
    
    console.log('🎉 All seeds completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
};

// Check if this file is being run directly
if (require.main === module) {
  runSeeds();
}

module.exports = { runSeeds };