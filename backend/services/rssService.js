// backend/services/rssService.js
const RSSParser = require('rss-parser');
const axios = require('axios');
const sanitizeHtml = require('sanitize-html');
const Source = require('../models/Source');
const News = require('../models/News');
const { parse } = require('node-html-parser');

// Configurare custom pentru RSS Parser
const parser = new RSSParser({
    customFields: {
        item: [
            ['media:content', 'media'],
            ['media:thumbnail', 'thumbnail'],
            ['enclosure', 'enclosure'],
            ['content:encoded', 'contentEncoded'],
            ['dc:creator', 'creator']
        ],
    }
});

/**
 * Parsează un feed RSS și returnează itemele
 * @param {String} feedUrl - URL-ul feed-ului RSS
 * @returns {Promise<Array>} Lista de iteme din feed
 */
const parseFeed = async (feedUrl) => {
    try {
        const feed = await parser.parseURL(feedUrl);
        return {
            title: feed.title,
            description: feed.description,
            link: feed.link,
            items: feed.items
        };
    } catch (error) {
        console.error(`Eroare la parsarea feed-ului ${feedUrl}:`, error);
        throw error;
    }
};

/**
 * Extrage prima imagine dintr-un HTML
 * @param {String} html - Conținutul HTML
 * @returns {String|null} URL-ul imaginii sau null dacă nu există
 */
const extractImageFromHtml = (html) => {
    if (!html) return null;

    try {
        const root = parse(html);
        const img = root.querySelector('img');
        return img ? img.getAttribute('src') : null;
    } catch (error) {
        console.error('Eroare la extragerea imaginii din HTML:', error);
        return null;
    }
};

/**
 * Extrage URL-ul imaginii din item RSS
 * @param {Object} item - Item RSS
 * @returns {String|null} URL-ul imaginii sau null dacă nu există
 */
const extractImageUrl = (item) => {
    // Încearcă să extragă din diferite câmpuri posibile
    if (item.media && item.media.$ && item.media.$.url) {
        return item.media.$.url;
    }

    if (item.thumbnail && item.thumbnail.$ && item.thumbnail.$.url) {
        return item.thumbnail.$.url;
    }

    if (item.enclosure && item.enclosure.url) {
        const type = item.enclosure.type || '';
        if (type.startsWith('image/')) {
            return item.enclosure.url;
        }
    }

    // Încearcă să extragă din conținut
    if (item.contentEncoded) {
        const imgUrl = extractImageFromHtml(item.contentEncoded);
        if (imgUrl) return imgUrl;
    }

    if (item.content) {
        const imgUrl = extractImageFromHtml(item.content);
        if (imgUrl) return imgUrl;
    }

    return null;
};

/**
 * Curăță și sanitizează conținut HTML
 * @param {String} content - Conținutul HTML
 * @returns {String} Conținut sanitizat
 */
const sanitizeContent = (content) => {
    if (!content) return '';

    return sanitizeHtml(content, {
        allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img']),
        allowedAttributes: {
            ...sanitizeHtml.defaults.allowedAttributes,
            img: ['src', 'alt', 'title', 'width', 'height']
        }
    });
};

/**
 * Extrage categoriile din item RSS
 * @param {Object} item - Item RSS
 * @returns {Array} Lista de categorii
 */
const extractCategories = (item) => {
    const categories = [];

    if (item.categories && Array.isArray(item.categories)) {
        item.categories.forEach(category => {
            if (typeof category === 'string' && category.trim()) {
                categories.push(category.trim().toLowerCase());
            }
        });
    }

    return categories;
};

/**
 * Transformă un item RSS în format știre
 * @param {Object} item - Item RSS
 * @param {Object} source - Sursa RSS
 * @returns {Object} Obiect format știre
 */
const transformItemToNews = (item, source) => {
    const publishDate = item.isoDate ? new Date(item.isoDate) : new Date();
    const imageUrl = extractImageUrl(item);
    const categories = extractCategories(item);
    const author = item.creator || item.author || 'Unknown';
    const content = item.contentEncoded || item.content || item.description || '';

    return {
        title: item.title || 'Untitled',
        description: item.description ? sanitizeHtml(item.description, { allowedTags: [] }) : '',
        content: sanitizeContent(content),
        url: item.link || '',
        imageUrl,
        publishDate,
        source: source._id,
        sourceName: source.name,
        categories,
        author
    };
};

/**
 * Procesează și salvează știri dintr-un feed RSS
 * @param {Object} source - Sursa RSS
 * @returns {Promise<Object>} Rezultatul procesării
 */
const processRssFeed = async (source) => {
    if (source.type !== 'rss') {
        throw new Error(`Sursa ${source.name} nu este de tip RSS`);
    }

    try {
        console.log(`Procesare feed RSS: ${source.name} (${source.url})`);

        const feed = await parseFeed(source.url);
        console.log(`Feed parsat, ${feed.items.length} iteme găsite`);

        let added = 0;
        let updated = 0;
        let skipped = 0;

        for (const item of feed.items) {
            if (!item.link) {
                console.warn(`Item fără link în feed ${source.name}, ignorat`);
                skipped++;
                continue;
            }

            // Verifică dacă știrea există deja
            const existingNews = await News.findOne({ url: item.link });

            if (existingNews) {
                // Doar actualizează anumite câmpuri dacă e necesar
                const transformedItem = transformItemToNews(item, source);

                if (!existingNews.imageUrl && transformedItem.imageUrl) {
                    existingNews.imageUrl = transformedItem.imageUrl;
                    await existingNews.save();
                    updated++;
                } else {
                    skipped++;
                }
            } else {
                // Creează știre nouă
                const newsData = transformItemToNews(item, source);
                const newNews = new News(newsData);
                await newNews.save();
                added++;
            }
        }

        // Actualizează timestamp-ul ultimei actualizări a sursei
        await Source.findByIdAndUpdate(source._id, {
            lastUpdated: new Date()
        });

        return {
            success: true,
            sourceId: source._id,
            sourceName: source.name,
            added,
            updated,
            skipped,
            total: feed.items.length
        };
    } catch (error) {
        console.error(`Eroare la procesarea feed-ului ${source.name}:`, error);
        return {
            success: false,
            sourceId: source._id,
            sourceName: source.name,
            error: error.message
        };
    }
};

/**
 * Procesează toate sursele RSS active
 * @returns {Promise<Array>} Rezultatele procesării
 */
const processAllRssFeeds = async () => {
    try {
        // Obține toate sursele RSS active
        const sources = await Source.find({
            type: 'rss',
            active: true
        });

        console.log(`Procesare ${sources.length} surse RSS`);

        const results = [];

        // Procesează fiecare sursă
        for (const source of sources) {
            try {
                const result = await processRssFeed(source);
                results.push(result);
            } catch (error) {
                console.error(`Eroare la procesarea sursei ${source.name}:`, error);
                results.push({
                    success: false,
                    sourceId: source._id,
                    sourceName: source.name,
                    error: error.message
                });
            }
        }

        return results;
    } catch (error) {
        console.error('Eroare la procesarea surselor RSS:', error);
        throw error;
    }
};

/**
 * Verifică și procesează sursele care necesită actualizare
 * @returns {Promise<Array>} Rezultatele procesării
 */
const processSourcesDueForUpdate = async () => {
    try {
        // Obține sursele RSS active care necesită actualizare
        const now = new Date();
        const sources = await Source.find({
            type: 'rss',
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
        });

        console.log(`${sources.length} surse RSS necesită actualizare`);

        const results = [];

        // Procesează fiecare sursă
        for (const source of sources) {
            try {
                const result = await processRssFeed(source);
                results.push(result);
            } catch (error) {
                console.error(`Eroare la procesarea sursei ${source.name}:`, error);
                results.push({
                    success: false,
                    sourceId: source._id,
                    sourceName: source.name,
                    error: error.message
                });
            }
        }

        return results;
    } catch (error) {
        console.error('Eroare la procesarea surselor care necesită actualizare:', error);
        throw error;
    }
};

module.exports = {
    parseFeed,
    processRssFeed,
    processAllRssFeeds,
    processSourcesDueForUpdate
};
