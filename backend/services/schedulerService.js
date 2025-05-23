// backend/services/schedulerService.js
const cron = require('cron');
const { processSourcesDueForUpdate } = require('./rssService');
const { cleanupOldNews } = require('./newsService');

// Job pentru actualizarea automată a feed-urilor RSS
const setupRssUpdateJob = () => {
    // Rulează la fiecare 15 minute
    const job = new cron.CronJob('*/15 * * * *', async () => {
        console.log('🔄 Rulare job actualizare RSS:', new Date().toISOString());
        try {
            const results = await processSourcesDueForUpdate();
            console.log(`✅ Job actualizare RSS finalizat, ${results.length} surse procesate`);

            let added = 0;
            let updated = 0;
            let failed = 0;

            results.forEach(result => {
                if (result.success) {
                    added += result.added || 0;
                    updated += result.updated || 0;
                } else {
                    failed++;
                }
            });

            console.log(`📊 Statistici: ${added} adăugate, ${updated} actualizate, ${failed} eșuate`);
        } catch (error) {
            console.error('❌ Eroare în job-ul de actualizare RSS:', error);
        }
    });

    return job;
};

// Job pentru curățarea știrilor vechi
const setupCleanupJob = () => {
    // Rulează la ora 3:00 AM în fiecare zi
    const job = new cron.CronJob('0 3 * * *', async () => {
        console.log('🧹 Rulare job curățare știri vechi:', new Date().toISOString());
        try {
            const result = await cleanupOldNews(30); // Păstrează știrile din ultimele 30 zile
            console.log(`✅ Job curățare finalizat: ${result.deleted} știri vechi șterse`);
        } catch (error) {
            console.error('❌ Eroare în job-ul de curățare:', error);
        }
    });

    return job;
};

// Inițializează și pornește toate job-urile programate
const initScheduledJobs = () => {
    const rssUpdateJob = setupRssUpdateJob();
    const cleanupJob = setupCleanupJob();

    // Pornește job-urile
    rssUpdateJob.start();
    cleanupJob.start();

    console.log('⏰ Job-uri programate inițializate și pornite.');

    return {
        rssUpdateJob,
        cleanupJob
    };
};

module.exports = {
    initScheduledJobs
};
