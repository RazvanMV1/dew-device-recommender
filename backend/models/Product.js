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

// Adăugare indecși pentru îmbunătățirea performanței
ProductSchema.index({ name: 1 });
ProductSchema.index({ brand: 1 });
ProductSchema.index({ category: 1 });
ProductSchema.index({ price: 1 });
ProductSchema.index({ createdAt: -1 });

// Poți adăuga și un index compus pentru căutări frecvente
ProductSchema.index({ category: 1, brand: 1, price: 1 });

module.exports = mongoose.model('Product', ProductSchema);
