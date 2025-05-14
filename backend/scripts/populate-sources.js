// scripts/populate-sources.js

require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const connectDB = require('../db');
const Source = require('../models/Source');

const initialSources = [
    {
        name: 'The Verge - Gadgets RSS',
        type: 'rss',
        url: 'https://www.theverge.com/rss/gadgets-all',
        description: 'Știri despre cele mai recente gadget-uri de la The Verge',
        updateFrequency: 30, // minute
        active: true,
        tags: ['news', 'gadgets', 'tech']
    },
    {
        name: 'CNET - Mobile Reviews',
        type: 'rss',
        url: 'https://www.cnet.com/rss/reviews/mobile/',
        description: 'Recenzii produse mobile de la CNET',
        updateFrequency: 60, // minute
        active: true,
        tags: ['reviews', 'mobile', 'smartphones']
    },
    {
        name: 'GSMArena',
        type: 'scraping',
        url: 'https://www.gsmarena.com',
        description: 'Specificații detaliate pentru telefoane și tablete',
        updateFrequency: 120, // minute
        active: true,
        tags: ['specs', 'phones', 'tablets']
    },
    {
        name: 'eMAG API',
        type: 'api',
        url: 'https://api.emag.ro/product-feed',
        description: 'Feed de produse de la eMAG',
        updateFrequency: 360, // minute
        active: false, // inactiv implicit
        credentials: {
            apiKey: 'dummy_key_replace_with_real'
        },
        tags: ['ecommerce', 'prices']
    }
];

async function populateSources() {
    try {
        await connectDB();
        console.log('✅ Conectat la baza de date');

        // Verifică dacă avem deja surse în baza de date
        const existingCount = await Source.countDocuments();

        if (existingCount > 0) {
            console.log(`⚠️ Baza de date conține deja ${existingCount} surse. Dorești să adaugi surse noi? (da/nu)`);

            // Aici ar fi mai bine să folosim readline pentru input de la utilizator
            // Dar pentru simplitate, vom adăuga direct surse noi
            console.log('Adăugăm surse noi...');
        }

        // Adaugă surse inițiale
        for (const sourceData of initialSources) {
            // Verifică dacă sursa există deja (după URL)
            const existingSource = await Source.findOne({ url: sourceData.url });

            if (existingSource) {
                console.log(`⚠️ Sursa cu URL ${sourceData.url} există deja.`);
            } else {
                const newSource = new Source(sourceData);
                await newSource.save();
                console.log(`✅ Sursa "${sourceData.name}" adăugată cu succes.`);
            }
        }

        console.log('✅ Populare surse finalizată.');

    } catch (error) {
        console.error('❌ Eroare la popularea surselor:', error);
    } finally {
        await mongoose.connection.close();
        console.log('🔌 Conexiune închisă.');
    }
}

populateSources();
