// backend/services/newsService.js
const News = require('../models/News');
const Source = require('../models/Source');

/**
 * Obține știri cu filtrare și paginare
 * @param {Object} filters - Filtre pentru știri
 * @param {Object} options - Opțiuni de paginare și sortare
 * @returns {Promise<Array>} Lista de știri
 */
const getNews = async (filters = {}, options = {}) => {
    try {
        const query = News.find(filters);

        // Aplicare opțiuni de sortare
        if (options.sort) {
            query.sort(options.sort);
        } else {
            // Sortare implicită după data publicării, descrescător
            query.sort({ publishDate: -1 });
        }

        // Aplicare paginare
        if (options.page && options.limit) {
            const page = parseInt(options.page);
            const limit = parseInt(options.limit);
            query.skip((page - 1) * limit).limit(limit);
        } else if (options.limit) {
            query.limit(parseInt(options.limit));
        }

        return await query.exec();
    } catch (error) {
        console.error('Eroare la preluarea știrilor:', error);
        throw error;
    }
};

/**
 * Obține o știre după ID
 * @param {String} id - ID-ul știrii
 * @returns {Promise<Object>} Știrea găsită sau null
 */
const getNewsById = async (id) => {
    try {
        return await News.findById(id);
    } catch (error) {
        console.error('Eroare la preluarea știrii după ID:', error);
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
        return await getNews({ source: sourceId }, options);
    } catch (error) {
        console.error(`Eroare la preluarea știrilor pentru sursa ${sourceId}:`, error);
        throw error;
    }
};

/**
 * Obține știri după categorie
 * @param {String} category - Categoria
 * @param {Object} options - Opțiuni de paginare și sortare
 * @returns {Promise<Array>} Lista de știri
 */
const getNewsByCategory = async (category, options = {}) => {
    try {
        return await getNews({ categories: category }, options);
    } catch (error) {
        console.error(`Eroare la preluarea știrilor pentru categoria ${category}:`, error);
        throw error;
    }
};

/**
 * Obține cele mai recente știri
 * @param {Number} limit - Numărul de știri
 * @returns {Promise<Array>} Lista de știri
 */
const getLatestNews = async (limit = 10) => {
    try {
        return await getNews({}, { limit, sort: { publishDate: -1 } });
    } catch (error) {
        console.error('Eroare la preluarea celor mai recente știri:', error);
        throw error;
    }
};

/**
 * Marchează o știre ca procesată și leagă produse de aceasta
 * @param {String} id - ID-ul știrii
 * @param {Array} productIds - ID-urile produselor legate
 * @returns {Promise<Object>} Știrea actualizată
 */
const markNewsAsProcessed = async (id, productIds = []) => {
    try {
        return await News.findByIdAndUpdate(
            id,
            {
                isProcessed: true,
                relatedProducts: productIds,
                updatedAt: new Date()
            },
            { new: true }
        );
    } catch (error) {
        console.error(`Eroare la marcarea știrii ${id} ca procesată:`, error);
        throw error;
    }
};

/**
 * Șterge știri mai vechi de o anumită perioadă
 * @param {Number} days - Numărul de zile
 * @returns {Promise<Object>} Rezultatul operațiunii
 */
const cleanupOldNews = async (days = 30) => {
    try {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);

        const result = await News.deleteMany({
            publishDate: { $lt: cutoffDate }
        });

        return {
            success: true,
            deleted: result.deletedCount,
            cutoffDate
        };
    } catch (error) {
        console.error(`Eroare la ștergerea știrilor vechi:`, error);
        throw error;
    }
};

/**
 * Caută știri după text
 * @param {String} searchText - Textul căutat
 * @param {Object} options - Opțiuni de paginare și sortare
 * @returns {Promise<Array>} Lista de știri
 */
const searchNews = async (searchText, options = {}) => {
    try {
        const searchRegex = new RegExp(searchText, 'i');

        return await getNews({
            $or: [
                { title: searchRegex },
                { description: searchRegex },
                { content: searchRegex }
            ]
        }, options);
    } catch (error) {
        console.error(`Eroare la căutarea după "${searchText}":`, error);
        throw error;
    }
};

module.exports = {
    getNews,
    getNewsById,
    getNewsBySource,
    getNewsByCategory,
    getLatestNews,
    markNewsAsProcessed,
    cleanupOldNews,
    searchNews
};
