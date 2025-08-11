const Cart = require('../models/Cart');

// Function to cleanup expired carts and release reserved stock
const cleanupExpiredCarts = async () => {
    try {
        console.log('Starting cart cleanup job...');

        const cleanedCount = await Cart.cleanupExpiredCarts();

        if (cleanedCount > 0) {
            console.log(`Cleaned up ${cleanedCount} expired carts and released reserved stock`);
        }
    } catch (error) {
        console.error('Error in cart cleanup job:', error);
    }
};

// Function to start the periodic cleanup job
const startCartCleanupJob = () => {
    // Run cleanup every 10 minutes
    const cleanupInterval = 10 * 60 * 1000; // 10 minutes in milliseconds

    console.log('Starting cart cleanup job - will run every 10 minutes');

    // Run once immediately
    cleanupExpiredCarts();

    // Then run periodically
    setInterval(cleanupExpiredCarts, cleanupInterval);
};

module.exports = {
    cleanupExpiredCarts,
    startCartCleanupJob
};