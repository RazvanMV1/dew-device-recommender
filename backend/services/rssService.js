const RSSParser = require('rss-parser');
const axios = require('axios');
const sanitizeHtml = require('sanitize-html');
const { parse } = require('node-html-parser');
const Source = require('../models/Source');
const News = require('../models/News');

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

const extractImageUrl = (item) => {
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

const transformItemToNews = (item, source) => {
    const publishDate = item.isoDate ? new Date(item.isoDate) : new Date();
    const imageUrl = extractImageUrl(item);
    const categories = extractCategories(item);
    const author = item.creator || item.author || 'Unknown';
    const content = item.contentEncoded || item.content || item.description || '';

    let description = '';
    if (item.description && item.description.trim()) {
        description = sanitizeHtml(item.description, { allowedTags: [] });
    } else if (content) {
        const plainContent = sanitizeHtml(content, { allowedTags: [] });
        description = plainContent.substring(0, 250) + (plainContent.length > 250 ? '...' : '');
    } else {
        description = item.title ? `${item.title} - știre din ${source.name}` : `Știre din ${source.name}`;
    }

    if (!description.trim()) {
        description = `Știre de pe ${source.name} publicată la ${publishDate.toLocaleString()}`;
    }

    return {
        title: item.title || `Știre din ${source.name}`,
        description: description,
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

            const existingNews = await News.findOne({ url: item.link });

            if (existingNews) {
                const transformedItem = transformItemToNews(item, source);

                if (!existingNews.imageUrl && transformedItem.imageUrl) {
                    existingNews.imageUrl = transformedItem.imageUrl;
                    await existingNews.save();
                    updated++;
                } else {
                    skipped++;
                }
            } else {
                const newsData = transformItemToNews(item, source);
                const newNews = new News(newsData);
                await newNews.save();
                added++;
            }
        }

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

const processAllRssFeeds = async () => {
    try {
        const sources = await Source.find({
            type: 'rss',
            active: true
        });

        console.log(`Procesare ${sources.length} surse RSS`);

        const results = [];

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

const processSourcesDueForUpdate = async () => {
    try {
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
                            { $multiply: ['$updateFrequency', 60 * 1000] }
                        ]
                    }
                }
            ]
        });

        console.log(`${sources.length} surse RSS necesită actualizare`);

        const results = [];

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

const detectImageMimeType = async (imageUrl) => {
    try {
        const response = await axios.head(imageUrl);
        return response.headers['content-type'];
    } catch (error) {
        console.warn(`Nu s-a putut detecta tipul imaginii pentru ${imageUrl}:`, error.message);
        return null;
    }
};

const isValidUrl = (url) => {
    try {
        new URL(url);
        return true;
    } catch (error) {
        return false;
    }
};

const fixRelativeUrl = (url, baseUrl) => {
    try {
        if (!url) return null;

        if (url.match(/^(http|https):\/\//i)) {
            return url;
        }

        const base = new URL(baseUrl);

        if (url.startsWith('//')) {
            return `${base.protocol}${url}`;
        }

        if (url.startsWith('/')) {
            return `${base.origin}${url}`;
        }

        return new URL(url, baseUrl).href;
    } catch (error) {
        console.warn(`Nu s-a putut corecta URL-ul relativ ${url}:`, error.message);
        return url;
    }
};

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

        const newsCountMap = {};
        newsCountBySource.forEach(item => {
            newsCountMap[item._id] = item.count;
        });

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
