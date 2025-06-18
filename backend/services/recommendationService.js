const Product = require('../models/Product');

function extractKeywords(text) {
    if (!text) return [];
    return [...new Set(
        text.toLowerCase().split(/\s+/).filter(word => word.length > 2).slice(0, 6)
    )];
}

function computeSimilarity(original, other) {
    let score = 0;

    if (original.brand && other.brand && original.brand === other.brand) score += 3;

    if (original.category && other.category && original.category === other.category) score += 2;

    if (original.price && other.price) {
        const minPrice = original.price * 0.75;
        const maxPrice = original.price * 1.25;
        if (other.price >= minPrice && other.price <= maxPrice) score += 2;
    }

    if (Array.isArray(original.features) && Array.isArray(other.features)) {
        const originalFeatures = new Set(original.features.map(f => f.toLowerCase()));
        const nCommon = (other.features || []).filter(f => originalFeatures.has(f.toLowerCase())).length;
        score += nCommon;
    }

    if (original.name && other.name) {
        const origKeywords = extractKeywords(original.name);
        const otherKeywords = extractKeywords(other.name);
        if (origKeywords.some(k => otherKeywords.includes(k))) score += 1;
    }

    return score;
}

async function getSimilarProducts(productId, limit = 12) {
    const original = await Product.findById(productId).lean();
    if (!original) return [];

    const keywords = extractKeywords(original.name);
    const baseFilter = {
        _id: { $ne: original._id },
        $or: [
            { category: original.category },
            { brand: original.brand },
            { name: { $regex: keywords.join('|'), $options: 'i' } }
        ]
    };

    const candidates = await Product.find(baseFilter).lean().limit(50);

    const withScore = candidates.map(prod => ({
        ...prod,
        similarityScore: computeSimilarity(original, prod)
    }));

    withScore.sort((a, b) => {
        if (b.similarityScore !== a.similarityScore)
            return b.similarityScore - a.similarityScore;
        if ((b.stars || 0) !== (a.stars || 0))
            return (b.stars || 0) - (a.stars || 0);
        return (b.reviewsCount || 0) - (a.reviewsCount || 0);
    });

    return withScore.slice(0, limit);
}

module.exports = { getSimilarProducts };
