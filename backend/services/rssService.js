// backend/services/rssService.js
const RSSParser = require('rss-parser');
const axios = require('axios');
const sanitizeHtml = require('sanitize-html');
const { parse } = require('node-html-parser');
const Source = require('../models/Source');
const News = require('../models/News');

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

    // Asigură-te că există întotdeauna o descriere
    let description = '';
    if (item.description && item.description.trim()) {
        // Folosește descrierea din feed dacă există
        description = sanitizeHtml(item.description, { allowedTags: [] });
    } else if (content) {
        // Extrage o descriere scurtă din conținut dacă descrierea nu există
        const plainContent = sanitizeHtml(content, { allowedTags: [] });
        description = plainContent.substring(0, 250) + (plainContent.length > 250 ? '...' : '');
    } else {
        // Folosește titlul ca descriere dacă nici conținutul nu există
        description = item.title ? `${item.title} - știre din ${source.name}` : `Știre din ${source.name}`;
    }

    // Ne asigurăm că descrierea nu este goală
    if (!description.trim()) {
        description = `Știre de pe ${source.name} publicată la ${publishDate.toLocaleString()}`;
    }

    return {
        title: item.title || `Știre din ${source.name}`,
        description: description,  // Asigură-te că avem întotdeauna o descriere
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

/**
 * Detectează formatul imaginii (MIME type) dintr-o imagine URL
 * @param {String} imageUrl - URL-ul imaginii
 * @returns {Promise<String|null>} MIME type-ul imaginii sau null în caz de eroare
 */
const detectImageMimeType = async (imageUrl) => {
    try {
        // Verifică doar headerul pentru a determina tipul de conținut
        const response = await axios.head(imageUrl);
        return response.headers['content-type'];
    } catch (error) {
        console.warn(`Nu s-a putut detecta tipul imaginii pentru ${imageUrl}:`, error.message);
        return null;
    }
};

/**
 * Verifică dacă un URL este valid
 * @param {String} url - URL-ul de verificat
 * @returns {Boolean} - true dacă URL-ul este valid
 */
const isValidUrl = (url) => {
    try {
        new URL(url);
        return true;
    } catch (error) {
        return false;
    }
};

/**
 * Corectează URL-uri relative
 * @param {String} url - URL-ul de corectat
 * @param {String} baseUrl - URL-ul de bază
 * @returns {String} - URL-ul corectat
 */
const fixRelativeUrl = (url, baseUrl) => {
    try {
        if (!url) return null;

        // Verifică dacă URL-ul este deja absolut
        if (url.match(/^(http|https):\/\//i)) {
            return url;
        }

        // Creează URL-ul de bază
        const base = new URL(baseUrl);

        // Dacă URL-ul începe cu //, adaugă doar protocolul
        if (url.startsWith('//')) {
            return `${base.protocol}${url}`;
        }

        // Dacă URL-ul începe cu /, adaugă doar domeniul
        if (url.startsWith('/')) {
            return `${base.origin}${url}`;
        }

        // Pentru alte URL-uri relative
        return new URL(url, baseUrl).href;
    } catch (error) {
        console.warn(`Nu s-a putut corecta URL-ul relativ ${url}:`, error.message);
        return url;
    }
};

/**
 * Obține statistici despre sursele RSS
 * @returns {Promise<Object>} Statistici despre surse
 */
const getRssSourcesStats = async () => {
    try {
        const [totalSources, activeSources, sourcesByType, newsCountBySource] = await Promise.all([
            Source.countDocuments({ type: 'rss' }),
            Source.countDocuments({ type: 'rss', active: true }),
            Source.aggregate([
                { $match: { type: 'rss' } },
                { $group: { _id: '$active', count: { $sum: 1 } } }
            ]),
            News.aggregate([
                { $group: { _id: '$source', count: { $sum: 1 } } }
            ])
        ]);

        // Construiește un map pentru numărul de știri pe sursă
        const newsCountMap = {};
        newsCountBySource.forEach(item => {
            newsCountMap[item._id] = item.count;
        });

        // Obține detaliile surselor active
        const activeSourcesDetails = await Source.find({ type: 'rss', active: true })
            .sort({ name: 1 })
            .lean();

        const sourceStats = activeSourcesDetails.map(source => ({
            id: source._id,
            name: source.name,
            url: source.url,
            newsCount: newsCountMap[source._id] || 0,
            lastUpdated: source.lastUpdated || null,
            updateFrequency: source.updateFrequency || 60
        }));

        return {
            totalSources,
            activeSources,
            inactiveSources: totalSources - activeSources,
            sourceStats
        };
    } catch (error) {
        console.error('Eroare la obținerea statisticilor pentru surse RSS:', error);
        throw error;
    }
};

// Exportă toate funcțiile
module.exports = {
    parseFeed,
    processRssFeed,
    processAllRssFeeds,
    processSourcesDueForUpdate,
    extractImageFromHtml,
    extractImageUrl,
    sanitizeContent,
    extractCategories,
    transformItemToNews,
    detectImageMimeType,
    isValidUrl,
    fixRelativeUrl,
    getRssSourcesStats
};
