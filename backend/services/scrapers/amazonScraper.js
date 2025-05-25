// services/scrapers/amazonScraper.js

const fetch = require('node-fetch'); // npm install node-fetch@2
const Product = require('../../models/Product'); // Folosești modelul unic Product

async function importAmazonProductsFromApify() {
    const url = 'https://api.apify.com/v2/datasets/SHYHI2ky6RmzNniVX/items?clean=true&format=json';
    const response = await fetch(url);
    const products = await response.json();

    let count = 0;
    for (const prod of products) {
        // Mapping către schema unică Product
        const productData = {
            name: prod.title || prod.name || '',
            brand: prod.brand || '',
            model: prod.model || '',
            price: prod.price ? prod.price.value : null,
            currency: prod.price ? prod.price.currency : '',
            color: prod.color || (prod.attributes ? (prod.attributes.find(a => a.key === "Color")?.value || '') : ''),
            autonomy: '', // Completezi dacă ai date, altfel ""
            category: prod.breadCrumbs || '',
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
            // createdAt e completat automat de mongoose
        };

        // Upsert în colecția "Product"
        await Product.findOneAndUpdate(
            { url: productData.url }, // identificator unic
            productData,
            { upsert: true, new: true }
        );
        count++;
    }
    return count;
}

module.exports = { importAmazonProductsFromApify };
