const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
    name: { type: String, required: true },
    brand: { type: String },
    model: { type: String },
    price: { type: Number, required: true },
    color: { type: String },
    autonomy: { type: String },
    category: { type: String },
    image: { type: String },
    features: { type: [String] },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Product', ProductSchema);
