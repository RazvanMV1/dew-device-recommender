
require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const connectDB = require('../db');
const Source = require('../models/Source');

const predefinedSources = [
    {
        name: 'Gadget News',
        type: 'rss',
        url: 'https://www.gadget.ro/feed/',
        description: 'Noutăți despre tehnologie și gadgeturi',
        updateFrequency: 60,
        tags: ['tech', 'gadgets', 'reviews'],
        active: true
    },
    {
        name: 'Go4IT',
        type: 'rss',
        url: 'https://www.go4it.ro/rss/',
        description: 'Știri despre IT, gadgeturi și jocuri',
        updateFrequency: 90,
        tags: ['tech', 'games', 'IT'],
        active: true
    },
    {
        name: 'StartupCafe',
        type: 'rss',
        url: 'https://www.startupcafe.ro/rss',
        description: 'Știri despre startup-uri și antreprenoriat',
        updateFrequency: 120,
        tags: ['business', 'startups'],
        active: true
    },
    {
        name: 'Playtech',
        type: 'rss',
        url: 'https://playtech.ro/feed',
        description: 'Știri despre tehnologie și recenzii',
        updateFrequency: 60,
        tags: ['tech', 'reviews'],
        active: true
    },
    {
        name: 'Arena IT',
        type: 'rss',
        url: 'https://arena.ro/feed/',
        description: 'Noutăți din lumea IT și tehnologie',
        updateFrequency: 90,
        tags: ['tech', 'IT'],
        active: true
    }
];

async function populateSources() {
    try {
        await connectDB();
        console.log('Conectat la baza de date');

        let created = 0;
        let skipped = 0;

        for (const source of predefinedSources) {
            try {
                const existingSource = await Source.findOne({ url: source.url });

                if (existingSource) {
                    console.log(`Sursa ${source.name} există deja, se sare peste.`);
                    skipped++;
                } else {
                    await Source.create(source);
                    console.log(` Sursa "${source.name}" a fost creată.`);
                    created++;
                }
            } catch (error) {
                console.error(` Eroare la procesarea sursei "${source.name}":`, error);
            }
        }

        console.log('\n Sumar:');
        console.log(` Surse create: ${created}`);
        console.log(` Surse sărite (deja existente): ${skipped}`);

    } catch (error) {
        console.error(' Eroare la popularea surselor:', error);
    } finally {
        await mongoose.connection.close();
        console.log(' Conexiune închisă.');
    }
}

populateSources().then(() => {
    console.log(' Populare surse finalizată');
    process.exit(0);
}).catch(err => {
    console.error(' Eroare finală:', err);
    process.exit(1);
});
