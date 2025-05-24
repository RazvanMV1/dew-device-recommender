// backend/services/newsService.js
const News = require('../models/News');
const mongoose = require('mongoose');

/**
 * Obține lista de știri cu filtrare și paginare
 * @param {Object} filters - Filtre pentru știri
 * @param {Object} options - Opțiuni de paginare și sortare
 * @returns {Promise<Array>} Lista de știri
 */
const getNews = async (filters = {}, options = {}) => {
    try {
        const limit = options.limit || 20;
        const page = options.page || 1;
        const skip = (page - 1) * limit;

        const query = News.find(filters)
            .sort(options.sort || { publishDate: -1 })
            .skip(skip)
            .limit(limit);

        if (options.populate) {
            query.populate('source');
        }

        return await query.lean();
    } catch (error) {
        console.error('Eroare la extragerea știrilor:', error);
        throw error;
    }
};

/**
 * Obține o știre după ID
 * @param {String} id - ID-ul știrii
 * @returns {Promise<Object>} Obiectul știre
 */
const getNewsById = async (id) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(id)) {
            throw new Error('ID știre invalid');
        }

        return await News.findById(id).populate('source').lean();
    } catch (error) {
        console.error('Eroare la extragerea știrii:', error);
        throw error;
    }
};

/**
 * Obține cele mai recente știri
 * @param {Number} limit - Numărul de știri de returnat
 * @returns {Promise<Array>} Lista de știri recente
 */
const getLatestNews = async (limit = 10) => {
    try {
        return await News.find()
            .sort({ publishDate: -1 })
            .limit(limit)
            .lean();
    } catch (error) {
        console.error('Eroare la extragerea celor mai recente știri:', error);
        throw error;
    }
};

/**
 * Obține știri după sursă
 * @param {String} sourceId - ID-ul sursei
 * @param {Object} options - Opțiuni de paginare și sortare
 * @returns {Promise<Array>} Lista de știri
 */
const getNewsBySource = async (sourceId, options = {}) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(sourceId)) {
            throw new Error('ID sursă invalid');
        }

        const limit = options.limit || 20;
        const page = options.page || 1;
        const skip = (page - 1) * limit;

        return await News.find({ source: sourceId })
            .sort(options.sort || { publishDate: -1 })
            .skip(skip)
            .limit(limit)
            .lean();
    } catch (error) {
        console.error('Eroare la extragerea știrilor după sursă:', error);
        throw error;
    }
};

/**
 * Obține știri după categorie
 * @param {String} category - Categoria știrilor
 * @param {Object} options - Opțiuni de paginare și sortare
 * @returns {Promise<Array>} Lista de știri
 */
const getNewsByCategory = async (category, options = {}) => {
    try {
        const limit = options.limit || 20;
        const page = options.page || 1;
        const skip = (page - 1) * limit;

        return await News.find({ categories: category })
            .sort(options.sort || { publishDate: -1 })
            .skip(skip)
            .limit(limit)
            .lean();
    } catch (error) {
        console.error('Eroare la extragerea știrilor după categorie:', error);
        throw error;
    }
};

/**
 * Caută știri după cuvinte cheie
 * @param {String} searchQuery - Textul de căutare
 * @param {Object} options - Opțiuni de paginare și sortare
 * @returns {Promise<Array>} Lista de știri
 */
const searchNews = async (searchQuery, options = {}) => {
    try {
        const limit = options.limit || 20;
        const page = options.page || 1;
        const skip = (page - 1) * limit;

        // Creează un regex pentru căutare case-insensitive
        const regexSearch = new RegExp(searchQuery.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'i');

        return await News.find({
            $or: [
                { title: regexSearch },
                { description: regexSearch },
                { content: regexSearch },
                { author: regexSearch },
                { categories: regexSearch }
            ]
        })
        .sort(options.sort || { publishDate: -1 })
        .skip(skip)
        .limit(limit)
        .lean();
    } catch (error) {
        console.error('Eroare la căutarea știrilor:', error);
        throw error;
    }
};

/**
 * Marchează o știre ca procesată și adaugă produse asociate
 * @param {String} newsId - ID-ul știrii
 * @param {Array} relatedProducts - Lista de ID-uri de produse asociate
 * @returns {Promise<Object>} Știrea actualizată
 */
const markNewsAsProcessed = async (newsId, relatedProducts = []) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(newsId)) {
            throw new Error('ID știre invalid');
        }

        // Validează ID-urile produselor
        for (const productId of relatedProducts) {
            if (!mongoose.Types.ObjectId.isValid(productId)) {
                throw new Error(`ID produs invalid: ${productId}`);
            }
        }

        return await News.findByIdAndUpdate(
            newsId,
            {
                isProcessed: true,
                relatedProducts,
                updatedAt: Date.now()
            },
            { new: true }
        ).lean();
    } catch (error) {
        console.error('Eroare la marcarea știrii ca procesată:', error);
        throw error;
    }
};

/**
 * Generează raport cu distribuția știrilor pe surse
 * @returns {Promise<Array>} Raport de distribuție
 */
const getSourcesDistributionReport = async () => {
    try {
        return await News.aggregate([
            {
                $group: {
                    _id: '$source',
                    sourceName: { $first: '$sourceName' },
                    count: { $sum: 1 },
                    processedCount: {
                        $sum: { $cond: ['$isProcessed', 1, 0] }
                    },
                    latestNews: { $max: '$publishDate' }
                }
            },
            {
                $sort: { count: -1 }
            },
            {
                $lookup: {
                    from: 'sources',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'sourceDetails'
                }
            },
            {
                $project: {
                    _id: 1,
                    sourceName: 1,
                    count: 1,
                    processedCount: 1,
                    processedPercentage: {
                        $multiply: [
                            { $divide: ['$processedCount', '$count'] },
                            100
                        ]
                    },
                    latestNews: 1,
                    sourceType: { $arrayElemAt: ['$sourceDetails.type', 0] },
                    sourceActive: { $arrayElemAt: ['$sourceDetails.active', 0] }
                }
            }
        ]);
    } catch (error) {
        console.error('Eroare la generarea raportului de distribuție:', error);
        throw error;
    }
};

/**
 * Obține statistici pentru știri
 * @returns {Promise<Object>} Statistici
 */
const getNewsStats = async () => {
    try {
        const [totalCount, processedCount, sourcesCount, categoriesStats] = await Promise.all([
            News.countDocuments(),
            News.countDocuments({ isProcessed: true }),
            News.distinct('source').then(sources => sources.length),
            News.aggregate([
                { $unwind: '$categories' },
                { $group: {
                    _id: '$categories',
                    count: { $sum: 1 }
                }},
                { $sort: { count: -1 } },
                { $limit: 10 }
            ])
        ]);

        return {
            totalCount,
            processedCount,
            processedPercentage: (processedCount / totalCount) * 100,
            sourcesCount,
            categoriesStats
        };
    } catch (error) {
        console.error('Eroare la obținerea statisticilor pentru știri:', error);
        throw error;
    }
};

module.exports = {
    getNews,
    getNewsById,
    getLatestNews,
    getNewsBySource,
    getNewsByCategory,
    searchNews,
    markNewsAsProcessed,
    getSourcesDistributionReport,
    getNewsStats
};
