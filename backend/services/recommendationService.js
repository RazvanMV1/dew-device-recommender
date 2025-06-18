const Product = require('../models/Product');
const User = require('../models/User');

function extractKeywords(text) {
    if (!text) return [];
    return [...new Set(
        text.toLowerCase().split(/[\s,.\-\/]/).filter(word => word.length > 2)
    )];
}

function computeSimilarity(original, other, userContext = null) {
    let score = 0;

    if (original.brand && other.brand && original.brand === other.brand) score += 15;
    if (original.category && other.category && original.category === other.category) score += 25;

    if (original.price && other.price) {
        const delta = Math.abs(original.price - other.price) / original.price;
        if (delta <= 0.08) score += 18;
        else if (delta <= 0.25) score += 10;
    }

    if (Array.isArray(original.features) && Array.isArray(other.features)) {
        const origSet = new Set(original.features.map(f => f.toLowerCase()));
        const nCommon = (other.features || []).filter(f => origSet.has(f.toLowerCase())).length;
        score += nCommon * 4;
    }

    if (original.name && other.name) {
        const origKeywords = extractKeywords(original.name);
        const otherKeywords = extractKeywords(other.name);
        const nCommon = origKeywords.filter(k => otherKeywords.includes(k)).length;
        score += nCommon * 2;
    }

    if (original.description && other.description) {
        const origDescWords = extractKeywords(original.description);
        const otherDescWords = extractKeywords(other.description);
        const nCommonDesc = origDescWords.filter(k => otherDescWords.includes(k)).length;
        score += nCommonDesc;
    }

    if (userContext) {
        if (userContext.likedProducts?.includes(other._id.toString())) score += 30;
        if (userContext.recentlyViewed?.includes(other._id.toString())) score += 15;
    }

    if (original.name && other.name) {
        const tags = ["pro", "ultra", "max"];
        for (const t of tags) {
            if (original.name.toLowerCase().includes(t) && other.name.toLowerCase().includes(t))
                score += 3;
        }
    }

    return score;
}

async function getSimilarProducts(productId, userId = null, limit = 12) {
    const original = await Product.findById(productId).lean();
    if (!original) return [];

    let userContext = null;
    if (userId) {
        const user = await User.findById(userId).lean();
        if (user) {
            userContext = {
                likedProducts: user.likedProducts || [],
                recentlyViewed: user.recentlyViewed || [],
            };
        }
    }

    const keywords = [
        ...extractKeywords(original.name),
        ...(original.features || []).flatMap(f => extractKeywords(f))
    ];
    const keywordSet = [...new Set(keywords)].slice(0, 8);

    const baseFilter = {
        _id: { $ne: original._id },
        $or: [
            { category: original.category },
            { brand: original.brand },
            { name: { $regex: keywordSet.join('|'), $options: 'i' } },
            { features: { $in: keywordSet } }
        ]
    };

    const candidates = await Product.find(baseFilter).lean().limit(70);

    const withScore = candidates.map(prod => ({
        ...prod,
        similarityScore: computeSimilarity(original, prod, userContext)
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
