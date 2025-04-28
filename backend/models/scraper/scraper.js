// backend/scraper/scraper.js

const axios = require('axios');
const mongoose = require('mongoose');
require('dotenv').config(); // ca să citești MongoDB URI din .env

const Product = require('../Product');

// Conectare MongoDB
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.error('MongoDB connection error:', err));

// Functia principala de scraping
async function scrapeProducts() {
    try {
        const response = await axios.get('https://fakestoreapi.com/products');
        const products = response.data;

        for (const item of products) {
            const newProduct = new Product({
                name: item.title,
                brand: 'Unknown', // API-ul nu oferă brand, așa că punem ceva generic
                model: 'N/A',
                price: item.price,
                color: 'Various',
                autonomy: 'N/A',
                category: item.category,
                image: item.image,
                features: ['sample feature 1', 'sample feature 2']
            });

            await newProduct.save();
            console.log(`Saved product: ${newProduct.name}`);
        }

        console.log('All products saved successfully!');
        process.exit(0); // închide script-ul după ce a terminat

    } catch (err) {
        console.error('Error scraping products:', err);
        process.exit(1);
    }
}

// Rulează funcția
scrapeProducts();
