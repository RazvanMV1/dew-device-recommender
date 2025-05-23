// backend/scripts/update-sources.js
require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const connectDB = require('../db');
const Source = require('../models/Source');

// URL-uri valide pentru surse RSS
const validSources = [
    {
        name: 'The Verge',
        url: 'https://www.theverge.com/rss/index.xml',
        type: 'rss'
    },
    {
        name: 'Wired',
        url: 'https://www.wired.com/feed/rss',
        type: 'rss'
    },
    {
        name: 'TechCrunch',
        url: 'https://techcrunch.com/feed/',
        type: 'rss'
    },
    {
        name: 'Engadget',
        url: 'https://www.engadget.com/rss.xml',
        type: 'rss'
    },
    {
        name: 'Gadget News',
        url: 'https://www.gadget.ro/feed/',
        type: 'rss'
    }
];

async function updateSources() {
    try {
        await connectDB();
        console.log('✅ Conectat la baza de date');

        // Dezactivează toate sursele existente
        await Source.updateMany({}, { active: false });
        console.log('✅ Toate sursele existente au fost dezactivate');

        // Adaugă sau actualizează sursele valide
        for (const sourceData of validSources) {
            // Verifică dacă sursa există deja
            const existingSource = await Source.findOne({ url: sourceData.url });

            if (existingSource) {
                // Actualizează sursa existentă
                await Source.updateOne(
                    { _id: existingSource._id },
                    {
                        name: sourceData.name,
                        active: true,
                        updateFrequency: 60, // 60 minute
                        lastUpdated: null // Reset lastUpdated pentru a forța actualizarea
                    }
                );
                console.log(`✅ Sursa "${sourceData.name}" a fost actualizată`);
            } else {
                // Creează o sursă nouă
                await Source.create({
                    ...sourceData,
                    description: `Feed RSS pentru ${sourceData.name}`,
                    active: true,
                    updateFrequency: 60, // 60 minute
                    tags: ['tech', 'news']
                });
                console.log(`✅ Sursa "${sourceData.name}" a fost creată`);
            }
        }

        // Afișează sumarul surselor active
        const activeSourcesCount = await Source.countDocuments({ active: true });
        console.log(`\n📊 Sumar: ${activeSourcesCount} surse active`);

    } catch (error) {
        console.error('❌ Eroare la actualizarea surselor:', error);
    } finally {
        await mongoose.connection.close();
        console.log('🔌 Conexiune închisă.');
    }
}

// Rulează funcția
updateSources().then(() => {
    console.log('🎯 Actualizare surse finalizată');
    process.exit(0);
}).catch(err => {
    console.error('❌ Eroare finală:', err);
    process.exit(1);
});
