require('dotenv').config();
const express = require('express');
const cors = require("cors");
const mongoose = require('mongoose');
const authRoutes = require('../server/routes/auth');
const adminRoutes = require('../server/routes/admin');

const app = express();

// Middleware to parse JSON requests
app.use(express.json());

const corsOptions = {
    origin: true,
    credentials: true,
    optionSuccessStatus: 200,
};

app.use(cors(corsOptions));
// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/fixpharmacy', {

})
    .then(() => console.log("MongoDB connected."))
    .catch(err => console.error("MongoDB connection error:", err));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/products', require('../server/routes/product'));
app.use('/api/orders', require('../server/routes/order'));
app.use('/api/cart', require('../server/routes/cart'));
app.use('/api/admin/orders', require('../server/routes/adminOrders'));

// Global error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Server Error',
    });
});

const PORT = process.env.PORT || 5500;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
