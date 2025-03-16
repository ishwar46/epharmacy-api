const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please add a product name']
    },
    description: {
        type: String,
        required: [true, 'Please add a product description']
    },
    dosage: {
        type: String,
        required: [true, 'Please specify the dosage']
    },
    images: {
        type: [String],
        default: []
    },
    price: {
        type: Number,
        required: [true, 'Please add the product price']
    },
    stock: {
        type: Number,
        required: [true, 'Please add the stock quantity']
    },

    category: {
        type: String,
        enum: [
            'Beauty & Cosmetic',
            'Oral Care',
            'Antiseptic & Disinfectant',
            'Anti-Hypertensive',
            'Anti-Histamin/Allergy',
            'Hormones',
            'Cream and Ointment',
            'Eye and Ear',
            'ENT DROPS',
            'Anti-Coagulants',
            'Gout',
            'NSAIDs',
            'Steroids',
            'Anti-Fungal',
            'Personal Care',
            "Men's Care",
            'Health Kits',
            'Medical Equipment',
            'Digital Stethoscope',
            'Herbal',
            'Herbal Tea',
            'Oil',
            'Baby Food',
            'Health and Beauty',
            'Baby Products',
            'Surgical Items & Equipment',
            'Diuretics',
            'Anti-Thyroid',
            'Vitamin & Supplements',
            'Anti-Inflammatory',
            'Anti-Biotic',
            'Gastrology',
            'Cardiac',
            'Diabetes',
            'Anti-Cold',
            'Asthma',
            'Ayurveda',
            'Women Hygiene',
            'Anti-Cancer'
        ],
        required: [true, 'Please specify a valid category']
    },

    brand: {
        type: String,
        required: [true, 'Please specify the product brand or manufacturer']
    },

    medicineType: {
        type: String,
        enum: ['OTC', 'Prescription'],
        required: [true, 'Please specify if the product is OTC or Prescription']
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Product', ProductSchema);
