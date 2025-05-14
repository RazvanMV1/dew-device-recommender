// services/sourceService.js
const Source = require('../models/Source');
const { sanitizeText } = require('../utils/validator');

/**
 * Preia toate sursele din baza de date, cu filtrare opțională
 * @param {Object} filters - Filtre opționale (tip, activ, etc.)
 * @param {Object} options - Opțiuni pentru paginare și sortare
 * @returns {Promise<Array>} Lista de surse
 */
const getSources = async (filters = {}, options = {}) => {
    try {
        const query = Source.find(filters);

        // Aplicare opțiuni de sortare
        if (options.sort) {
            query.sort(options.sort);
        } else {
            // Sortare implicită după data creării, descrescător
            query.sort({ createdAt: -1 });
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
        console.error('Eroare la preluarea surselor:', error);
        throw error;
    }
};

/**
 * Preia o sursă după ID
 * @param {String} id - ID-ul sursei
 * @returns {Promise<Object>} Sursa găsită sau null
 */
const getSourceById = async (id) => {
    try {
        return await Source.findById(id);
    } catch (error) {
        console.error('Eroare la preluarea sursei după ID:', error);
        throw error;
    }
};

/**
 * Preia surse după tip
 * @param {String} type - Tipul sursei (rss, api, scraping, manual)
 * @returns {Promise<Array>} Lista de surse de tipul specificat
 */
const getSourcesByType = async (type) => {
    try {
        return await Source.find({ type, active: true });
    } catch (error) {
        console.error(`Eroare la preluarea surselor de tip ${type}:`, error);
        throw error;
    }
};

/**
 * Creează o sursă nouă
 * @param {Object} sourceData - Datele sursei
 * @returns {Promise<Object>} Sursa creată
 */
const createSource = async (sourceData) => {
    try {
        // Sanitizare date sensibile
        const sanitizedData = {
            ...sourceData,
            name: sanitizeText(sourceData.name),
            description: sourceData.description ? sanitizeText(sourceData.description) : undefined,
            url: sanitizeText(sourceData.url),
            tags: sourceData.tags ? sourceData.tags.map(tag => sanitizeText(tag)) : undefined
        };

        const newSource = new Source(sanitizedData);
        return await newSource.save();
    } catch (error) {
        console.error('Eroare la crearea sursei:', error);
        throw error;
    }
};

/**
 * Actualizează o sursă existentă
 * @param {String} id - ID-ul sursei
 * @param {Object} updateData - Datele pentru actualizare
 * @returns {Promise<Object>} Sursa actualizată
 */
const updateSource = async (id, updateData) => {
    try {
        // Sanitizare date sensibile
        const sanitizedData = { ...updateData };
        if (updateData.name) sanitizedData.name = sanitizeText(updateData.name);
        if (updateData.description) sanitizedData.description = sanitizeText(updateData.description);
        if (updateData.url) sanitizedData.url = sanitizeText(updateData.url);
        if (updateData.tags) sanitizedData.tags = updateData.tags.map(tag => sanitizeText(tag));

        return await Source.findByIdAndUpdate(
            id,
            sanitizedData,
            { new: true, runValidators: true }
        );
    } catch (error) {
        console.error('Eroare la actualizarea sursei:', error);
        throw error;
    }
};

/**
 * Marchează o sursă ca fiind actualizată
 * @param {String} id - ID-ul sursei
 * @returns {Promise<Object>} Sursa actualizată
 */
const markSourceAsUpdated = async (id) => {
    try {
        return await Source.findByIdAndUpdate(
            id,
            { lastUpdated: new Date() },
            { new: true }
        );
    } catch (error) {
        console.error('Eroare la marcarea sursei ca actualizată:', error);
        throw error;
    }
};

/**
 * Activează sau dezactivează o sursă
 * @param {String} id - ID-ul sursei
 * @param {Boolean} isActive - Starea activă (true) sau inactivă (false)
 * @returns {Promise<Object>} Sursa actualizată
 */
const toggleSourceActive = async (id, isActive) => {
    try {
        return await Source.findByIdAndUpdate(
            id,
            { active: isActive },
            { new: true }
        );
    } catch (error) {
        console.error('Eroare la activarea/dezactivarea sursei:', error);
        throw error;
    }
};

/**
 * Șterge o sursă
 * @param {String} id - ID-ul sursei
 * @returns {Promise<Object>} Rezultatul operațiunii de ștergere
 */
const deleteSource = async (id) => {
    try {
        return await Source.findByIdAndDelete(id);
    } catch (error) {
        console.error('Eroare la ștergerea sursei:', error);
        throw error;
    }
};

/**
 * Obține surse care trebuie actualizate
 * @param {String} type - Tipul surselor (opțional)
 * @returns {Promise<Array>} Lista de surse care necesită actualizare
 */
const getSourcesDueForUpdate = async (type = null) => {
    try {
        const now = new Date();
        const query = {
            active: true,
            $or: [
                { lastUpdated: { $exists: false } },
                {
                    $expr: {
                        $gte: [
                            { $subtract: [now, '$lastUpdated'] },
                            { $multiply: ['$updateFrequency', 60 * 1000] } // convertire minute în ms
                        ]
                    }
                }
            ]
        };

        if (type) {
            query.type = type;
        }

        return await Source.find(query);
    } catch (error) {
        console.error('Eroare la preluarea surselor pentru actualizare:', error);
        throw error;
    }
};

module.exports = {
    getSources,
    getSourceById,
    getSourcesByType,
    createSource,
    updateSource,
    markSourceAsUpdated,
    toggleSourceActive,
    deleteSource,
    getSourcesDueForUpdate
};
