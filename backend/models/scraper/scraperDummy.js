const axios = require('axios');
const mongoose = require('mongoose');
require('dotenv').config();
console.log('MONGO_URI:', process.env.MONGO_URI);
const Product = require('../Product'); // Atenție: corect calea!

async function scrapeDummyProducts() {
    try {
        await mongoose.connect(process.env.MONGO_URI);

        const response = await axios.get('https://dummyjson.com/products?limit=20');
        const products = response.data.products;

        for (const item of products) {
            // Validare minimă: să aibă preț și imagine
            if (!item.price || !item.thumbnail) continue;

            const newProduct = new Product({
                name: item.title || "No name",
                brand: item.brand || "Unknown",
                model: item.title || "N/A", // DummyJSON nu are model separat
                price: item.price,
                color: 'Various',
                autonomy: 'N/A',
                category: item.category || "Other",
                image: item.thumbnail,
                features: [item.description], // Bagăm descrierea la features ca să nu pierdem info
            });

            await newProduct.save();
            console.log(`Saved product from DummyJSON: ${newProduct.name}`);
        }

        console.log('All DummyJSON products saved successfully!');
        mongoose.connection.close();
    } catch (err) {
        console.error('Error scraping DummyJSON products:', err.message);
    }
}

scrapeDummyProducts();
