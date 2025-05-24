// services/scrapers/amazonScraper.js
const fetch = require('node-fetch'); // npm install node-fetch@2
const mongoose = require('mongoose');

const AmazonProductSchema = new mongoose.Schema({
    title: String,
    price: Number,
    url: String,
    image: String
}, { timestamps: true });

const AmazonProduct = mongoose.models.AmazonProduct || mongoose.model('AmazonProduct', AmazonProductSchema);

async function importAmazonProductsFromApify() {
    const url = 'https://api.apify.com/v2/datasets/SHYHI2ky6RmzNniVX/items?clean=true&format=json';
    const response = await fetch(url);
    const products = await response.json();

    let count = 0;
    for (const prod of products) {
        await AmazonProduct.findOneAndUpdate(
            { url: prod.url || prod.detailUrl || prod.asin || prod.title }, // caută ceva unic
            {
                title: prod.title || prod.name || '',
                price: prod.price.value || prod.currentPrice || null,
                url: prod.url || prod.detailUrl || '',
                image: prod.image || (prod.images && prod.images[0]) || ''
            },
            { upsert: true, new: true }
        );
        count++;
    }
    return count;
}

module.exports = { importAmazonProductsFromApify };
