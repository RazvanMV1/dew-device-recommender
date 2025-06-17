const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
    name: { type: String, required: true },
    brand: { type: String },
    model: { type: String },
    price: { type: Number, required: false },
    currency: { type: String },
    color: { type: String },
    autonomy: { type: String },
    category: { type: String },
    asin: { type: String },
    url: { type: String },
    image: { type: String },
    galleryThumbnails: { type: [String] },
    description: { type: String },
    features: { type: [String] },
    stars: { type: Number },
    reviewsCount: { type: Number },
    inStock: { type: Boolean },
    breadCrumbs: { type: String },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

ProductSchema.index({ name: 1 });
ProductSchema.index({ brand: 1 });
ProductSchema.index({ category: 1 });
ProductSchema.index({ price: 1 });
ProductSchema.index({ createdAt: -1 });
ProductSchema.index({ category: 1, brand: 1, price: 1 });

module.exports = mongoose.model('Product', ProductSchema);
