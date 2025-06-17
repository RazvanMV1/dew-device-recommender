const Product = require('../models/Product');

function extractKeywords(text) {
    if (!text) return [];
    return [...new Set(
        text.toLowerCase().split(/\s+/).filter(word => word.length > 2).slice(0, 6)
    )];
}

async function getSimilarProducts(productId, limit = 10) {
    const original = await Product.findById(productId);
    if (!original) return [];

    const keywords = extractKeywords(original.name);

    const filter = {
        _id: { $ne: original._id },
        $or: [
            { category: original.category },
            { brand: original.brand },
            { name: { $regex: keywords.join('|'), $options: 'i' } }
        ]
    };

    return await Product.find(filter)
        .sort({ stars: -1, reviewsCount: -1 })
        .limit(limit);
}

module.exports = { getSimilarProducts };
