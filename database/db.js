const mongoose = require("mongoose");
require('dotenv').config();

const DB = process.env.MONGO_URI;

const connectToDatabase = async () => {
    try {
        await mongoose.connect(DB, {
            serverSelectionTimeoutMS: 10000,
        });
        console.log("Database is Connected");
    } catch (error) {
        console.error("Database connection error:", error);
        process.exit(1);
    }
};

module.exports = connectToDatabase;
