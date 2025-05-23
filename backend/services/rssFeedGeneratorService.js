// backend/services/rssFeedGeneratorService.js
const xml2js = require('xml2js');
const Product = require('../models/Product');
const News = require('../models/News');

/**
 * Generează un feed RSS cu produse recomandate
 * @param {Array} products - Lista de produse pentru feed
 * @param {String} title - Titlul feed-ului
 * @param {String} description - Descrierea feed-ului
 * @param {String} baseUrl - URL-ul de bază al site-ului
 * @returns {Promise<String>} XML feed RSS
 */
const generateProductRssFeed = async (products, title, description, baseUrl) => {
    const now = new Date();

    const feedObj = {
        rss: {
            $: {
                version: '2.0',
                'xmlns:atom': 'http://www.w3.org/2005/Atom',
                'xmlns:content': 'http://purl.org/rss/1.0/modules/content/'
            },
            channel: {
                title: title || 'ElectroRecommender - Produse Recomandate',
                description: description || 'Feed RSS cu cele mai recente produse electronice recomandate',
                link: baseUrl || 'http://localhost:3000',
                language: 'ro',
                lastBuildDate: now.toUTCString(),
                'atom:link': {
                    $: {
                        href: `${baseUrl || 'http://localhost:3000'}/api/feed/products`,
                        rel: 'self',
                        type: 'application/rss+xml'
                    }
                },
                item: products.map(product => ({
                    title: product.name,
                    description: `${product.brand} ${product.model} - ${product.price} RON`,
                    link: `${baseUrl || 'http://localhost:3000'}/products/${product._id}`,
                    guid: {
                        $: { isPermaLink: false },
                        _: product._id.toString()
                    },
                    category: product.category,
                    pubDate: product.createdAt.toUTCString(),
                    'content:encoded': {
                        _: `
                            <h2>${product.name}</h2>
                            <p><strong>Brand:</strong> ${product.brand || 'N/A'}</p>
                            <p><strong>Model:</strong> ${product.model || 'N/A'}</p>
                            <p><strong>Preț:</strong> ${product.price} RON</p>
                            <p><strong>Culoare:</strong> ${product.color || 'N/A'}</p>
                            <p><strong>Autonomie:</strong> ${product.autonomy || 'N/A'}</p>
                            ${product.image ? `<img src="${product.image}" alt="${product.name}" />` : ''}
                            ${product.features && product.features.length > 0 ?
                                `<h3>Caracteristici:</h3><ul>${product.features.map(f => `<li>${f}</li>`).join('')}</ul>` : ''}
                        `
                    }
                }))
            }
        }
    };

    const builder = new xml2js.Builder({
        xmldec: { 'version': '1.0', 'encoding': 'UTF-8' },
        renderOpts: { pretty: true, indent: '  ', newline: '\n' }
    });

    return builder.buildObject(feedObj);
};

/**
 * Generează un feed RSS cu știri
 * @param {Array} news - Lista de știri pentru feed
 * @param {String} title - Titlul feed-ului
 * @param {String} description - Descrierea feed-ului
 * @param {String} baseUrl - URL-ul de bază al site-ului
 * @returns {Promise<String>} XML feed RSS
 */
const generateNewsRssFeed = async (news, title, description, baseUrl) => {
    const now = new Date();

    const feedObj = {
        rss: {
            $: {
                version: '2.0',
                'xmlns:atom': 'http://www.w3.org/2005/Atom',
                'xmlns:content': 'http://purl.org/rss/1.0/modules/content/'
            },
            channel: {
                title: title || 'ElectroRecommender - Știri Tech',
                description: description || 'Cele mai recente știri despre dispozitive electronice',
                link: baseUrl || 'http://localhost:3000',
                language: 'ro',
                lastBuildDate: now.toUTCString(),
                'atom:link': {
                    $: {
                        href: `${baseUrl || 'http://localhost:3000'}/api/feed/news`,
                        rel: 'self',
                        type: 'application/rss+xml'
                    }
                },
                item: news.map(item => ({
                    title: item.title,
                    description: item.description,
                    link: item.url,
                    guid: {
                        $: { isPermaLink: false },
                        _: item._id.toString()
                    },
                    category: item.categories.join(', '),
                    pubDate: item.publishDate.toUTCString(),
                    'content:encoded': {
                        _: item.content || item.description
                    },
                    ...(item.imageUrl ? { enclosure: { $: { url: item.imageUrl, type: 'image/jpeg' } } } : {})
                }))
            }
        }
    };

    const builder = new xml2js.Builder({
        xmldec: { 'version': '1.0', 'encoding': 'UTF-8' },
        renderOpts: { pretty: true, indent: '  ', newline: '\n' }
    });

    return builder.buildObject(feedObj);
};

module.exports = {
    generateProductRssFeed,
    generateNewsRssFeed
};
