const cron = require('node-cron');
const { processSourcesDueForUpdate } = require('./rssService');

let scheduledJobs = {};

const initScheduledJobs = () => {
    stopAllJobs();

    scheduledJobs.rssFeedUpdate = cron.schedule('*/10 * * * *', async () => {
        console.log('[Scheduled Job] Verificare surse RSS pentru actualizare...');
        try {
            const results = await processSourcesDueForUpdate();
            const successfulUpdates = results.filter(r => r.success).length;
            const totalSources = results.length;

            console.log(`[Scheduled Job] S-au actualizat ${successfulUpdates}/${totalSources} surse RSS`);

            if (successfulUpdates > 0) {
                const totalAdded = results.reduce((sum, r) => sum + (r.added || 0), 0);
                const totalUpdated = results.reduce((sum, r) => sum + (r.updated || 0), 0);
                console.log(`[Scheduled Job] S-au adăugat ${totalAdded} știri noi și s-au actualizat ${totalUpdated} știri`);
            }

            const failedSources = results.filter(r => !r.success);
            if (failedSources.length > 0) {
                console.error(`[Scheduled Job] Surse cu erori: ${failedSources.map(s => s.sourceName).join(', ')}`);
            }
        } catch (error) {
            console.error('[Scheduled Job] Eroare la procesarea surselor programate:', error);
        }
    });

    scheduledJobs.cleanOldNews = cron.schedule('*/10 * * * *', async () => {
        console.log('[Scheduled Job] Curățare știri vechi...');
        try {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - 60);

            const News = require('../models/News');
            const result = await News.deleteMany({
                publishDate: { $lt: cutoffDate },
                isProcessed: false
            });

            console.log(`[Scheduled Job] S-au șters ${result.deletedCount} știri vechi`);
        } catch (error) {
            console.error('[Scheduled Job] Eroare la curățarea știrilor vechi:', error);
        }
    });

    console.log('Job-uri programate inițializate cu succes');
};

const stopAllJobs = () => {
    Object.values(scheduledJobs).forEach(job => {
        if (job && typeof job.stop === 'function') {
            job.stop();
        }
    });
    scheduledJobs = {};
};

const startJob = (jobName) => {
    const job = scheduledJobs[jobName];
    if (job) {
        job.start();
        console.log(`Job-ul '${jobName}' a fost pornit`);
    } else {
        console.error(`Job-ul '${jobName}' nu există`);
    }
};

const stopJob = (jobName) => {
    const job = scheduledJobs[jobName];
    if (job) {
        job.stop();
        console.log(`Job-ul '${jobName}' a fost oprit`);
    } else {
        console.error(`Job-ul '${jobName}' nu există`);
    }
};

const updateJobSchedule = (jobName, cronExpression) => {
    stopJob(jobName);
    initScheduledJobs();
};

module.exports = {
    initScheduledJobs,
    stopAllJobs,
    startJob,
    stopJob,
    updateJobSchedule
};
