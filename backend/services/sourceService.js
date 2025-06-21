const Source = require('../models/Source');
const { sanitizeText } = require('../utils/validator');

const getSources = async (filters = {}, options = {}) => {
    try {
        const query = Source.find(filters);

        if (options.sort) {
            query.sort(options.sort);
        } else {
            query.sort({ createdAt: -1 });
        }

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

const getSourceById = async (id) => {
    try {
        return await Source.findById(id);
    } catch (error) {
        console.error('Eroare la preluarea sursei după ID:', error);
        throw error;
    }
};

const getSourcesByType = async (type) => {
    try {
        return await Source.find({ type, active: true });
    } catch (error) {
        console.error(`Eroare la preluarea surselor de tip ${type}:`, error);
        throw error;
    }
};

const createSource = async (sourceData) => {
    try {
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

const updateSource = async (id, updateData) => {
    try {
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

const deleteSource = async (id) => {
    try {
        return await Source.findByIdAndDelete(id);
    } catch (error) {
        console.error('Eroare la ștergerea sursei:', error);
        throw error;
    }
};

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
                            { $multiply: ['$updateFrequency', 60 * 1000] }
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
