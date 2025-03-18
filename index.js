require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const path = require("path");
const connectToDatabase = require('./database/db');

// Import all routes
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const productRoutes = require('./routes/product');
const orderRoutes = require('./routes/order');
const cartRoutes = require('./routes/cart');
const adminOrderRoutes = require('./routes/adminOrders');
const userRoutes = require('./routes/user');

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

app.get("/", (req, res) => {
    res.send("Hello!!");
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
            console.log(`Server is running on PORT ${PORT}`);
        });
    } catch (error) {
        console.error("Failed to connect to the database. Server not started.", error);
        process.exit(1);
    }
};

startServer();
