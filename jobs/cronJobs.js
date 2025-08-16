const cron = require('node-cron');
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const Order = require('../models/Order');
const User = require('../models/User');
const fs = require('fs');
const path = require('path');

console.log('🚀 Initializing FixPharmacy background jobs...');

// ==========================================
// CART MANAGEMENT JOBS
// ==========================================

// Cleanup expired carts every 10 minutes (matching your existing interval)
cron.schedule('*/10 * * * *', async () => {
    try {
        console.log('🧹 Running cart cleanup job...');
        const cleanedUp = await Cart.cleanupExpiredCarts();
        if (cleanedUp > 0) {
            console.log(`✅ Cleaned up ${cleanedUp} expired carts and released reserved stock`);
        }
    } catch (error) {
        console.error('❌ Cart cleanup job failed:', error);
    }
});

// ==========================================
// INVENTORY MANAGEMENT JOBS
// ==========================================

// Check for low stock products every 6 hours
cron.schedule('0 */6 * * *', async () => {
    try {
        console.log('📦 Checking for low stock products...');

        const lowStockProducts = await Product.find({
            $expr: {
                $lte: [
                    { $subtract: ['$stock', { $ifNull: ['$reservedStock', 0] }] },
                    5 // Low stock threshold
                ]
            },
            status: 'active'
        });

        if (lowStockProducts.length > 0) {
            console.log(`⚠️  Found ${lowStockProducts.length} products with low stock:`);
            lowStockProducts.forEach(product => {
                console.log(`   - ${product.name}: ${product.availableStock} ${product.stockUnit || 'units'} remaining`);
            });

            // You can implement email notifications here
            // await sendLowStockAlert(lowStockProducts);
        } else {
            console.log('✅ All products have sufficient stock');
        }
    } catch (error) {
        console.error('❌ Low stock check job failed:', error);
    }
});

// ==========================================
// REVENUE & ORDER MANAGEMENT JOBS
// ==========================================

// Record revenue for delivered orders every hour
cron.schedule('0 * * * *', async () => {
    try {
        console.log('💰 Recording revenue for delivered orders...');

        const deliveredOrders = await Order.find({
            status: 'delivered',
            'revenue.recorded': false
        });

        for (const order of deliveredOrders) {
            await order.recordRevenue();
        }

        if (deliveredOrders.length > 0) {
            console.log(`✅ Recorded revenue for ${deliveredOrders.length} delivered orders`);
        }
    } catch (error) {
        console.error('❌ Revenue recording job failed:', error);
    }
});

// ==========================================
// DAILY REPORTING JOBS
// ==========================================

// Generate daily sales report at 11 PM every day
cron.schedule('0 23 * * *', async () => {
    try {
        console.log('📊 Generating daily sales report...');

        const today = new Date();
        const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

        const dailyStats = await Order.aggregate([
            {
                $match: {
                    createdAt: { $gte: startOfDay, $lt: endOfDay }
                }
            },
            {
                $group: {
                    _id: null,
                    totalOrders: { $sum: 1 },
                    totalRevenue: { $sum: '$pricing.total' },
                    deliveredOrders: {
                        $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] }
                    },
                    pendingOrders: {
                        $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
                    },
                    cancelledOrders: {
                        $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] }
                    },
                    prescriptionOrders: {
                        $sum: { $cond: ['$hasPrescriptionItems', 1, 0] }
                    }
                }
            }
        ]);

        const stats = dailyStats[0] || {
            totalOrders: 0,
            totalRevenue: 0,
            deliveredOrders: 0,
            pendingOrders: 0,
            cancelledOrders: 0,
            prescriptionOrders: 0
        };

        console.log('📈 Daily Sales Report for', startOfDay.toDateString());
        console.log('   📦 Total Orders:', stats.totalOrders);
        console.log('   💰 Total Revenue: Rs.', stats.totalRevenue);
        console.log('   ✅ Delivered:', stats.deliveredOrders);
        console.log('   ⏳ Pending:', stats.pendingOrders);
        console.log('   ❌ Cancelled:', stats.cancelledOrders);
        console.log('   💊 Prescription Orders:', stats.prescriptionOrders);

        // You can save this to database or send email report
        // await saveDailyReport(startOfDay, stats);

    } catch (error) {
        console.error('❌ Daily report generation failed:', error);
    }
});

// ==========================================
// WEEKLY MAINTENANCE JOBS
// ==========================================

// Clean up orphaned images every Sunday at 1 AM
cron.schedule('0 1 * * 0', async () => {
    try {
        console.log('🖼️  Cleaning up orphaned images...');

        const uploadDirs = [
            'uploads/userProfiles',
            'uploads/productImages',
            'uploads/prescriptions',
            'uploads/clientSignatures'
        ];

        let totalCleaned = 0;

        for (const uploadDir of uploadDirs) {
            const dirPath = path.join(__dirname, '..', uploadDir);
            
            if (!fs.existsSync(dirPath)) {
                console.log(`   ⚠️  Directory not found: ${uploadDir}`);
                continue;
            }

            const files = fs.readdirSync(dirPath);
            console.log(`   📁 Checking ${files.length} files in ${uploadDir}`);

            for (const file of files) {
                const filePath = path.join(dirPath, file);
                const relativePath = `/${uploadDir}/${file}`;

                let isReferenced = false;

                // Check if image is referenced in database
                if (uploadDir === 'uploads/userProfiles') {
                    const userCount = await User.countDocuments({ 
                        profilePicture: relativePath,
                        status: { $ne: 'inactive' }
                    });
                    isReferenced = userCount > 0;
                } else if (uploadDir === 'uploads/productImages') {
                    const productCount = await Product.countDocuments({ 
                        images: relativePath 
                    });
                    isReferenced = productCount > 0;
                }
                // Add more checks for prescriptions and signatures as needed

                // Delete if not referenced and file is older than 7 days
                if (!isReferenced) {
                    const stats = fs.statSync(filePath);
                    const fileAge = Date.now() - stats.mtime.getTime();
                    const sevenDays = 7 * 24 * 60 * 60 * 1000;

                    if (fileAge > sevenDays) {
                        try {
                            fs.unlinkSync(filePath);
                            console.log(`   🗑️  Deleted orphaned file: ${relativePath}`);
                            totalCleaned++;
                        } catch (deleteError) {
                            console.error(`   ❌ Failed to delete ${relativePath}:`, deleteError);
                        }
                    }
                }
            }
        }

        console.log(`✅ Orphaned image cleanup completed. Deleted ${totalCleaned} files`);
    } catch (error) {
        console.error('❌ Orphaned image cleanup job failed:', error);
    }
});

// Clean up old status history every Sunday at 2 AM
cron.schedule('0 2 * * 0', async () => {
    try {
        console.log('🗑️  Cleaning up old status history...');

        const orders = await Order.find({
            'statusHistory.50': { $exists: true } // Orders with more than 50 status entries
        });

        for (const order of orders) {
            // Keep only the last 50 status history entries
            order.statusHistory = order.statusHistory.slice(-50);
            await order.save();
        }

        if (orders.length > 0) {
            console.log(`✅ Cleaned up status history for ${orders.length} orders`);
        }
    } catch (error) {
        console.error('❌ Status history cleanup job failed:', error);
    }
});

// Generate weekly report every Monday at 8 AM
cron.schedule('0 8 * * 1', async () => {
    try {
        console.log('📊 Generating weekly sales report...');

        const today = new Date();
        const startOfWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

        const weeklyStats = await Order.aggregate([
            {
                $match: {
                    createdAt: { $gte: startOfWeek, $lte: today }
                }
            },
            {
                $group: {
                    _id: null,
                    totalOrders: { $sum: 1 },
                    totalRevenue: { $sum: '$pricing.total' },
                    averageOrderValue: { $avg: '$pricing.total' },
                    uniqueCustomers: { $addToSet: '$customer.user' }
                }
            }
        ]);

        const stats = weeklyStats[0] || {
            totalOrders: 0,
            totalRevenue: 0,
            averageOrderValue: 0,
            uniqueCustomers: []
        };

        console.log('📈 Weekly Report (Last 7 days):');
        console.log('   📦 Total Orders:', stats.totalOrders);
        console.log('   💰 Total Revenue: Rs.', stats.totalRevenue);
        console.log('   📊 Average Order Value: Rs.', Math.round(stats.averageOrderValue || 0));
        console.log('   👥 Unique Customers:', stats.uniqueCustomers.length);

    } catch (error) {
        console.error('❌ Weekly report generation failed:', error);
    }
});

// ==========================================
// MANUAL TRIGGER FUNCTIONS
// ==========================================

// Export functions for manual triggers (useful for testing or admin actions)
const manualTriggers = {
    // Manual cart cleanup
    cleanupExpiredCarts: async () => {
        console.log('🔧 Manual cart cleanup triggered...');
        return await Cart.cleanupExpiredCarts();
    },

    // Manual low stock check
    checkLowStock: async () => {
        console.log('🔧 Manual low stock check triggered...');
        return await Product.find({
            $expr: {
                $lte: [
                    { $subtract: ['$stock', { $ifNull: ['$reservedStock', 0] }] },
                    5
                ]
            },
            status: 'active'
        });
    },

    // Manual revenue recording
    recordPendingRevenue: async () => {
        console.log('🔧 Manual revenue recording triggered...');
        const orders = await Order.find({
            status: 'delivered',
            'revenue.recorded': false
        });

        for (const order of orders) {
            await order.recordRevenue();
        }

        return orders.length;
    },

    // Manual orphaned image cleanup
    cleanupOrphanedImages: async () => {
        console.log('🔧 Manual orphaned image cleanup triggered...');
        
        const uploadDirs = [
            'uploads/userProfiles',
            'uploads/productImages',
            'uploads/prescriptions',
            'uploads/clientSignatures'
        ];

        let totalCleaned = 0;

        for (const uploadDir of uploadDirs) {
            const dirPath = path.join(__dirname, '..', uploadDir);
            
            if (!fs.existsSync(dirPath)) continue;

            const files = fs.readdirSync(dirPath);

            for (const file of files) {
                const filePath = path.join(dirPath, file);
                const relativePath = `/${uploadDir}/${file}`;

                let isReferenced = false;

                if (uploadDir === 'uploads/userProfiles') {
                    const userCount = await User.countDocuments({ 
                        profilePicture: relativePath,
                        status: { $ne: 'inactive' }
                    });
                    isReferenced = userCount > 0;
                } else if (uploadDir === 'uploads/productImages') {
                    const productCount = await Product.countDocuments({ 
                        images: relativePath 
                    });
                    isReferenced = productCount > 0;
                }

                if (!isReferenced) {
                    const stats = fs.statSync(filePath);
                    const fileAge = Date.now() - stats.mtime.getTime();
                    const sevenDays = 7 * 24 * 60 * 60 * 1000;

                    if (fileAge > sevenDays) {
                        try {
                            fs.unlinkSync(filePath);
                            totalCleaned++;
                        } catch (deleteError) {
                            console.error(`Failed to delete ${relativePath}:`, deleteError);
                        }
                    }
                }
            }
        }

        return { cleanedFiles: totalCleaned };
    },

    // Get system health status
    getSystemHealth: async () => {
        try {
            const [
                totalProducts,
                lowStockCount,
                activeOrders,
                pendingRevenue,
                activeCarts
            ] = await Promise.all([
                Product.countDocuments({ status: 'active' }),
                Product.countDocuments({
                    $expr: {
                        $lte: [
                            { $subtract: ['$stock', { $ifNull: ['$reservedStock', 0] }] },
                            5
                        ]
                    },
                    status: 'active'
                }),
                Order.countDocuments({ status: { $nin: ['delivered', 'cancelled'] } }),
                Order.countDocuments({ status: 'delivered', 'revenue.recorded': false }),
                Cart.countDocuments({ status: 'active' })
            ]);

            return {
                products: {
                    total: totalProducts,
                    lowStock: lowStockCount
                },
                orders: {
                    active: activeOrders,
                    pendingRevenue: pendingRevenue
                },
                carts: {
                    active: activeCarts
                },
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error('❌ System health check failed:', error);
            throw error;
        }
    }
};

console.log('✅ All FixPharmacy background jobs initialized successfully!');
console.log('📅 Schedule:');
console.log('   🧹 Cart cleanup: Every 10 minutes');
console.log('   📦 Low stock check: Every 6 hours');
console.log('   💰 Revenue recording: Every hour');
console.log('   📊 Daily report: 11 PM daily');
console.log('   🖼️  Image cleanup: Sunday 1 AM');
console.log('   🗑️  History cleanup: Sunday 2 AM');
console.log('   📈 Weekly report: Monday 8 AM');

module.exports = manualTriggers;