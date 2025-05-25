const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
    name: { type: String, required: true },         // Sau title
    brand: { type: String },
    model: { type: String },
    price: { type: Number, required: false },
    currency: { type: String },                     // Nou!
    color: { type: String },
    autonomy: { type: String },
    category: { type: String },
    asin: { type: String },                         // Nou!
    url: { type: String },                          // Nou!
    image: { type: String },                        // Folosește thumbnailImage sau image
    galleryThumbnails: { type: [String] },          // Nou!
    description: { type: String },                  // Nou!
    features: { type: [String] },
    stars: { type: Number },                        // Nou!
    reviewsCount: { type: Number },                 // Nou!
    inStock: { type: Boolean },                     // Nou!
    breadCrumbs: { type: String },                  // Nou! Poți salva calea de categorii aici
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

// Indecși (păstrezi ce ai)
ProductSchema.index({ name: 1 });
ProductSchema.index({ brand: 1 });
ProductSchema.index({ category: 1 });
ProductSchema.index({ price: 1 });
ProductSchema.index({ createdAt: -1 });
ProductSchema.index({ category: 1, brand: 1, price: 1 });

module.exports = mongoose.model('Product', ProductSchema);
