require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const connectDB = require('../db');
const Source = require('../models/Source');

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
        console.log('Conectat la baza de date');

        await Source.updateMany({}, { active: false });
        console.log('Toate sursele existente au fost dezactivate');

        for (const sourceData of validSources) {
            const existingSource = await Source.findOne({ url: sourceData.url });

            if (existingSource) {
                await Source.updateOne(
                    { _id: existingSource._id },
                    {
                        name: sourceData.name,
                        active: true,
                        updateFrequency: 60,
                        lastUpdated: null
                    }
                );
                console.log(`Sursa "${sourceData.name}" a fost actualizată`);
            } else {
                await Source.create({
                    ...sourceData,
                    description: `Feed RSS pentru ${sourceData.name}`,
                    active: true,
                    updateFrequency: 60,
                    tags: ['tech', 'news']
                });
                console.log(`Sursa "${sourceData.name}" a fost creată`);
            }
        }

        const activeSourcesCount = await Source.countDocuments({ active: true });
        console.log(`\nSumar: ${activeSourcesCount} surse active`);

    } catch (error) {
        console.error('Eroare la actualizarea surselor:', error);
    } finally {
        await mongoose.connection.close();
        console.log('Conexiune închisă.');
    }
}

updateSources().then(() => {
    console.log('Actualizare surse finalizată');
    process.exit(0);
}).catch(err => {
    console.error('Eroare finală:', err);
    process.exit(1);
});
