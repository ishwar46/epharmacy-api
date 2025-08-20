require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const compression = require('compression');
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
const prescriptionRoutes = require('./routes/prescriptions');
const heroBannerRoutes = require('./routes/heroBanner');

// Import the new cron jobs (this will start them automatically)
const cronJobs = require('./jobs/cronJobs');

const app = express();

// Environment validation
const requiredEnvVars = ['MONGO_URI', 'JWT_SECRET'];
for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
        console.error(`❌ Required environment variable ${envVar} is not set`);
        process.exit(1);
    }
}

// Security middleware
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// Compression
app.use(compression());

// Request logging
if (process.env.NODE_ENV !== 'test') {
    app.use(morgan('combined'));
}

// Rate limiting for sensitive routes only (not for public browsing)
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 500, // increased limit for better UX
    message: {
        error: 'Too many requests from this IP, please try again later.',
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// More lenient limiter for semi-public routes
const publicLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // very high limit for public routes
    message: {
        error: 'Too many requests from this IP, please try again later.',
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// Import auth rate limiter from auth middleware
const { authLimiter } = require('./middleware/auth');

// Parse JSON
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Configure CORS
const allowedOrigins = process.env.ALLOWED_ORIGINS ?
    process.env.ALLOWED_ORIGINS.split(',') :
    ['http://localhost:5173', 'http://localhost:5174'];

const corsOptions = {
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));

// Hook up routes with appropriate rate limiting
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/admin', limiter, adminRoutes);
app.use('/api/products', productRoutes); // No rate limiting for public product browsing
app.use('/api/orders', publicLimiter, orderRoutes); // Lenient for order browsing
app.use('/api/cart', publicLimiter, cartRoutes); // Lenient for cart operations
app.use('/api/admin/orders', limiter, adminOrderRoutes);
app.use('/api/user', publicLimiter, userRoutes); // Lenient for user operations
app.use('/api/prescriptions', limiter, prescriptionRoutes);
app.use('/api/hero-banner', heroBannerRoutes); // Public endpoint for banner data

// Serve static files after API routes
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Cache for health check
let healthCache = null;
let healthCacheTime = 0;
const HEALTH_CACHE_TTL = 30000; // 30 seconds

// Async wrapper for better error handling
const asyncWrapper = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

// Health check route with system status
app.get("/", asyncWrapper(async (req, res) => {
    const now = Date.now();

    if (!healthCache || (now - healthCacheTime) > HEALTH_CACHE_TTL) {
        try {
            const systemHealth = await cronJobs.getSystemHealth();
            healthCache = {
                message: "FixPharmacy API is running! 🚀",
                environment: process.env.NODE_ENV || 'development',
                timestamp: new Date().toISOString(),
                systemHealth
            };
            healthCacheTime = now;
        } catch (error) {
            healthCache = {
                message: "FixPharmacy API is running! 🚀",
                environment: process.env.NODE_ENV || 'development',
                timestamp: new Date().toISOString(),
                error: "Could not fetch system health"
            };
            healthCacheTime = now;
        }
    }

    res.json(healthCache);
}));

// Admin endpoint to manually trigger jobs (useful for testing)
app.post('/api/admin/jobs/:jobName', asyncWrapper(async (req, res) => {
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
}));

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        message: `Route ${req.originalUrl} not found`,
    });
});

// Global error handling
app.use((err, _req, res, _next) => {
    console.error(`Error ${err.status || 500}: ${err.message}`);

    // Don't leak error details in production
    const isDevelopment = process.env.NODE_ENV === 'development';

    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Internal Server Error',
        ...(isDevelopment && { stack: err.stack })
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
const gracefulShutdown = (signal) => {
    console.log(`🛑 ${signal} received, shutting down gracefully`);

    server.close(async () => {
        console.log('🔌 HTTP server closed');

        try {
            // Close database connection
            const mongoose = require('mongoose');
            await mongoose.connection.close();
            console.log('🗄️ Database connection closed');
        } catch (error) {
            console.error('Error closing database connection:', error);
        }

        console.log('✅ Process terminated');
        process.exit(0);
    });

    // Force close server after 10 seconds
    setTimeout(() => {
        console.error('⚠️ Could not close connections in time, forcefully shutting down');
        process.exit(1);
    }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));