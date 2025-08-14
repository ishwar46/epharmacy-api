require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const path = require("path");
const connectToDatabase = require('./database/db');

// Import all routes
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const productRoutes = require('./routes/products');
const cartRoutes = require('./routes/cart');
const orderRoutes = require('./routes/orderRoutes');
const adminOrderRoutes = require('./routes/adminOrders');
const userRoutes = require('./routes/user');

// Import the new cron jobs (this will start them automatically)
const cronJobs = require('./jobs/cronJobs');

const app = express();

// Parse JSON
app.use(express.json());

// Configure CORS
const corsOptions = {
    origin: true,
    credentials: true,
    optionSuccessStatus: 200,
};
app.use(cors(corsOptions));

// Serve static files from the uploads folder
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Hook up routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/admin/orders', adminOrderRoutes);
app.use('/api/user', userRoutes);

// Health check route with system status
app.get("/", async (req, res) => {
    try {
        const systemHealth = await cronJobs.getSystemHealth();
        res.json({
            message: "FixPharmacy API is running! 🚀",
            environment: process.env.NODE_ENV || 'development',
            systemHealth
        });
    } catch (error) {
        res.json({
            message: "FixPharmacy API is running! 🚀",
            environment: process.env.NODE_ENV || 'development',
            error: "Could not fetch system health"
        });
    }
});

// Admin endpoint to manually trigger jobs (useful for testing)
app.post('/api/admin/jobs/:jobName', async (req, res) => {
    try {
        const { jobName } = req.params;

        if (!cronJobs[jobName]) {
            return res.status(400).json({
                success: false,
                message: 'Invalid job name',
                availableJobs: Object.keys(cronJobs)
            });
        }

        const result = await cronJobs[jobName]();

        res.json({
            success: true,
            message: `Job ${jobName} executed successfully`,
            result
        });
    } catch (error) {
        console.error('Manual job execution failed:', error);
        res.status(500).json({
            success: false,
            message: 'Job execution failed',
            error: error.message
        });
    }
});

// Global error handling
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Server Error',
    });
});

const PORT = process.env.PORT || 5500;
const server = http.createServer(app);

const startServer = async () => {
    try {
        await connectToDatabase();

        server.listen(PORT, () => {
            console.log(`🚀 Server is running on PORT ${PORT}`);
            console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
            console.log(`📅 Background jobs are active and scheduled`);
            console.log(`🏥 FixPharmacy API ready for requests!`);
        });
    } catch (error) {
        console.error("❌ Failed to connect to the database. Server not started.", error);
        process.exit(1);
    }
};

startServer();

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('🛑 SIGTERM received, shutting down gracefully');
    server.close(() => {
        console.log('✅ Process terminated');
    });
});

process.on('SIGINT', () => {
    console.log('🛑 SIGINT received, shutting down gracefully');
    server.close(() => {
        console.log('✅ Process terminated');
    });
});