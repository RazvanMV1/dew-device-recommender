// backend/scripts/initial-rss-fetch.js
require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const connectDB = require('../db');
const Source = require('../models/Source');
const rssService = require('../services/rssService');

async function initialRssFetch() {
    try {
        await connectDB();
        console.log('✅ Conectat la baza de date');

        // Obține toate sursele RSS active
        const sources = await Source.find({ type: 'rss', active: true });
        console.log(`🔍 ${sources.length} surse RSS active găsite`);

        if (sources.length === 0) {
            console.log('⚠️ Nu există surse RSS active. Adaugă surse RSS și încearcă din nou.');
            await mongoose.connection.close();
            return;
        }

        console.log('🚀 Începe procesarea feed-urilor RSS...');
        // Schimbăm aici - ne asigurăm că folosim corect rssService
        const results = await rssService.processAllRssFeeds();

        let totalAdded = 0;
        let totalUpdated = 0;
        let totalErrors = 0;

        for (const result of results) {
            if (result.success) {
                console.log(`✅ Sursa "${result.sourceName}": ${result.added} adăugate, ${result.updated} actualizate`);
                totalAdded += result.added || 0;
                totalUpdated += result.updated || 0;
            } else {
                console.log(`❌ Eroare la sursa "${result.sourceName}": ${result.error}`);
                totalErrors++;
            }
        }

        console.log('\n📊 Sumar:');
        console.log(`✅ Surse procesate cu succes: ${results.length - totalErrors}/${results.length}`);
        console.log(`📰 Știri adăugate: ${totalAdded}`);
        console.log(`📝 Știri actualizate: ${totalUpdated}`);
        console.log(`❌ Surse cu erori: ${totalErrors}`);

    } catch (error) {
        console.error('❌ Eroare la fetch-ul inițial RSS:', error);
    } finally {
        await mongoose.connection.close();
        console.log('🔌 Conexiune închisă.');
    }
}

// Rulează funcția
initialRssFetch().then(() => {
    console.log('🎯 Fetch inițial RSS finalizat');
    process.exit(0);
}).catch(err => {
    console.error('❌ Eroare finală:', err);
    process.exit(1);
});
