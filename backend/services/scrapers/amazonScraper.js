const fetch = require('node-fetch');
const Product = require('../../models/Product');


async function importAmazonProductsFromApify(apifyUrl, categoryName) {
    const response = await fetch(apifyUrl);
    const products = await response.json();

    let count = 0;

    for (const prod of products) {
        if (!prod.url || !prod.title || !prod.price?.value) {
            console.log(`⚠️ Sare produs invalid (lipsă URL/titlu/preț):`, prod.title);
            continue;
        }

        const productData = {
            name: prod.title || prod.name || '',
            brand: prod.brand || '',
            model: prod.model || '',
            price: prod.price?.value ?? null,
            currency: prod.price?.currency || '€',
            color: prod.color || (prod.attributes?.find(a => a.key === "Color")?.value || ''),
            autonomy: '',
            category: categoryName,
            asin: prod.asin || '',
            url: prod.url || '',
            image: prod.thumbnailImage || prod.image || (prod.images && prod.images[0]) || '',
            galleryThumbnails: prod.galleryThumbnails || [],
            description: prod.description || '',
            features: prod.features || [],
            stars: prod.stars || null,
            reviewsCount: prod.reviewsCount || null,
            inStock: prod.inStock || false,
            breadCrumbs: prod.breadCrumbs || '',
            updatedAt: new Date()
        };

        await Product.findOneAndUpdate(
            { url: productData.url },
            productData,
            { upsert: true, new: true }
        );

        count++;
    }

    return count;
}

module.exports = { importAmazonProductsFromApify };
