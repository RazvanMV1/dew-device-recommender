// backend/services/schedulerService.js
const cron = require('node-cron');
const { processSourcesDueForUpdate } = require('./rssService');

// Stare job-uri
let scheduledJobs = {};

/**
 * Inițializează job-urile programate pentru actualizarea RSS
 */
const initScheduledJobs = () => {
    // Eliberează resursele job-urilor existente
    stopAllJobs();

    // Programează job-ul principal pentru verificarea surselor la fiecare 10 minute
    scheduledJobs.rssFeedUpdate = cron.schedule('*/10 * * * *', async () => {
        console.log('🕒 [Scheduled Job] Verificare surse RSS pentru actualizare...');
        try {
            const results = await processSourcesDueForUpdate();
            const successfulUpdates = results.filter(r => r.success).length;
            const totalSources = results.length;

            console.log(`✅ [Scheduled Job] S-au actualizat ${successfulUpdates}/${totalSources} surse RSS`);

            if (successfulUpdates > 0) {
                const totalAdded = results.reduce((sum, r) => sum + (r.added || 0), 0);
                const totalUpdated = results.reduce((sum, r) => sum + (r.updated || 0), 0);
                console.log(`📰 [Scheduled Job] S-au adăugat ${totalAdded} știri noi și s-au actualizat ${totalUpdated} știri`);
            }

            // Înregistrează surse care au eșuat
            const failedSources = results.filter(r => !r.success);
            if (failedSources.length > 0) {
                console.error(`❌ [Scheduled Job] Surse cu erori: ${failedSources.map(s => s.sourceName).join(', ')}`);
            }
        } catch (error) {
            console.error('❌ [Scheduled Job] Eroare la procesarea surselor programate:', error);
        }
    });

    // Programează job pentru curățarea știrilor vechi - zilnic la 3 dimineața
    scheduledJobs.cleanOldNews = cron.schedule('0 3 * * *', async () => {
        console.log('🕒 [Scheduled Job] Curățare știri vechi...');
        try {
            // Păstrează știrile din ultimele 60 de zile
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - 60);

            const News = require('../models/News');
            const result = await News.deleteMany({
                publishDate: { $lt: cutoffDate },
                isProcessed: false // Șterge doar știrile neprocesate
            });

            console.log(`🧹 [Scheduled Job] S-au șters ${result.deletedCount} știri vechi`);
        } catch (error) {
            console.error('❌ [Scheduled Job] Eroare la curățarea știrilor vechi:', error);
        }
    });

    console.log('📅 Job-uri programate inițializate cu succes');
};

/**
 * Oprește toate job-urile programate
 */
const stopAllJobs = () => {
    Object.values(scheduledJobs).forEach(job => {
        if (job && typeof job.stop === 'function') {
            job.stop();
        }
    });
    scheduledJobs = {};
};

/**
 * Pornește un job particular după nume
 * @param {String} jobName - Numele job-ului
 */
const startJob = (jobName) => {
    const job = scheduledJobs[jobName];
    if (job) {
        job.start();
        console.log(`▶️ Job-ul '${jobName}' a fost pornit`);
    } else {
        console.error(`❌ Job-ul '${jobName}' nu există`);
    }
};

/**
 * Oprește un job particular după nume
 * @param {String} jobName - Numele job-ului
 */
const stopJob = (jobName) => {
    const job = scheduledJobs[jobName];
    if (job) {
        job.stop();
        console.log(`⏹️ Job-ul '${jobName}' a fost oprit`);
    } else {
        console.error(`❌ Job-ul '${jobName}' nu există`);
    }
};

/**
 * Actualizează frecvența unui job programat
 * @param {String} jobName - Numele job-ului
 * @param {String} cronExpression - Expresia cron pentru programare
 */
const updateJobSchedule = (jobName, cronExpression) => {
    stopJob(jobName);
    // Recreează job-ul cu noua programare - aici ar trebui logica specifică pentru fiecare job
    // Pentru simplitate, reinițializăm toate job-urile
    initScheduledJobs();
};

module.exports = {
    initScheduledJobs,
    stopAllJobs,
    startJob,
    stopJob,
    updateJobSchedule
};
