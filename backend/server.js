const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const querystring = require('querystring');
const mongoose = require('mongoose');
const connectDB = require('./db');
const config = require('./config/config');
const Product = require('./models/Product');
const Source = require('./models/Source');
const User = require('./models/User');
const News = require('./models/News');
const { verifyToken, isAdmin } = require('./middleware/auth');
const { securityHeaders } = require('./middleware/security');
const { rateLimiter } = require('./middleware/rateLimiter');
const { validateProduct, sanitizeText } = require('./utils/validator');
const authService = require('./services/authService');
const sourceService = require('./services/sourceService');
const rssService = require('./services/rssService');
const newsService = require('./services/newsService');
const schedulerService = require('./services/schedulerService');
const Activity = require('./models/Activity');

connectDB().then(() => {
    createDefaultAdmin();
    schedulerService.initScheduledJobs();
    console.log('Job-uri programate pentru actualizare RSS inițializate');
}).catch(err => {
    console.error('Eroare la conectarea la MongoDB:', err);
});
async function createDefaultAdmin() {
    try {
        const adminCount = await User.countDocuments({ role: 'admin' });

        if (adminCount === 0) {
            await authService.registerUser({
                username: 'admin',
                password: 'admin123SecureP@ss',
                role: 'admin'
            });
            console.log('Utilizator admin implicit creat');
        }
    } catch (error) {
        console.error('Eroare la crearea utilizatorului admin implicit:', error);
    }
}

function serveStaticFile(req, res, filePath, contentType, responseCode = 200) {
    securityHeaders(req, res, () => {
        fs.readFile(filePath, (err, data) => {
            if (err) {
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end('500 - Eroare internă server');
            } else {
                res.writeHead(responseCode, { 'Content-Type': contentType });
                res.end(data);
            }
        });
    });
}

async function parseRequestBody(req) {
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
            try {
                const parsedBody = JSON.parse(body);
                resolve(parsedBody);
            } catch (error) {
                reject(error);
            }
        });
        req.on('error', reject);
    });
}

function escapeXML(str) {
    if (!str) return '';
    return str.replace(/[<>&'"]/g, function (c) {
        switch (c) {
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '&': return '&amp;';
            case '\'': return '&apos;';
            case '"': return '&quot;';
        }
    });
}
const server = http.createServer(async (req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const method = req.method;
    const pathName = parsedUrl.pathname;

    console.log(`${method} ${pathName}`);
    rateLimiter(req, res, async () => {
        try {
            if (method === 'GET') {
                if (pathName === '/') {
                    serveStaticFile(req, res, path.join(__dirname, '../frontend/index.html'), 'text/html');
                } else if (pathName === '/stats') {
                    serveStaticFile(req, res, path.join(__dirname, '../frontend/stats.html'), 'text/html');
                } else if (pathName === '/profile') {
                    serveStaticFile(req, res, path.join(__dirname, '../frontend/profile.html'), 'text/html');
                } else if (pathName === '/news') {
                    serveStaticFile(req, res, path.join(__dirname, '../frontend/news.html'), 'text/html');
                } else if (pathName === '/admin') {
                    serveStaticFile(req, res, path.join(__dirname, '../frontend/dashboard.html'), 'text/html');
                } else if (pathName === '/products' || pathName === '/products.html') {
                    serveStaticFile(req, res, path.join(__dirname, '../frontend/products.html'), 'text/html');
                } else if (pathName === '/srs') {
                    serveStaticFile(req, res, path.join(__dirname, '../frontend/srs.html'), 'text/html');
                } else if (pathName === '/extension/extension.zip') {
                    serveStaticFile(req, res, path.join(__dirname, '../frontend/extension/extension.zip'), 'application/zip');
                } else if (pathName === '/preferences' || pathName === '/preferences.html') {
                    serveStaticFile(req, res, path.join(__dirname, '../frontend/preferences.html'), 'text/html');
                } else if (pathName === '/news-management' || pathName === '/news-management.html') {
                    serveStaticFile(req, res, path.join(__dirname, '../frontend/news-management.html'), 'text/html');
                }
                else if (pathName === '/components/header.html') {
                    serveStaticFile(req, res, path.join(__dirname, '../frontend/components/header.html'), 'text/html');
                }
                else if (pathName === '/components/header.css') {
                    serveStaticFile(req, res, path.join(__dirname, '../frontend/components/header.css'), 'text/css');
                }
                else if (pathName === '/components/header.js') {
                    serveStaticFile(req, res, path.join(__dirname, '../frontend/components/header.js'), 'text/javascript');
                }
                else if (pathName === '/login' || pathName === '/login.html') {
                    serveStaticFile(req, res, path.join(__dirname, '../frontend/login.html'), 'text/html');
                } else if (pathName === '/register' || pathName === '/register.html') {
                    serveStaticFile(req, res, path.join(__dirname, '../frontend/register-member.html'), 'text/html');
                } else if (pathName === '/register-admin' || pathName === '/register-admin.html') {
                    serveStaticFile(req, res, path.join(__dirname, '../frontend/register-admin.html'), 'text/html');
                }
                else if (pathName === '/rss/popular-products.xml') {
                    try {
                        const topProducts = await Product.find({})
                            .sort({ reviewsCount: -1 })
                            .limit(20);

                        let rss = `<?xml version="1.0" encoding="UTF-8" ?>
                <rss version="2.0">
                <channel>
                  <title>Top Produse Populare</title>
                  <link>http://localhost:3004/</link>
                  <description>Top produse după numărul de recenzii</description>
                  <language>ro-ro</language>
                `;

                        topProducts.forEach(prod => {
                            rss += `
                          <item>
                            <title>${escapeXML(prod.name)}</title>
                            <link>http://localhost:3004/products/${prod._id}</link>
                            <description><![CDATA[
                              <b>Brand:</b> ${escapeXML(prod.brand || '-')}<br/>
                              <b>Model:</b> ${escapeXML(prod.model || '-')}<br/>
                              <b>Preț:</b> ${prod.price ? prod.price + ' ' + (prod.currency || '') : '-'}<br/>
                              <b>Culoare:</b> ${escapeXML(prod.color || '-')}<br/>
                              <b>Autonomie:</b> ${escapeXML(prod.autonomy || '-')}<br/>
                              <b>Categorie:</b> ${escapeXML(prod.category || '-')}<br/>
                              <b>ASIN:</b> ${escapeXML(prod.asin || '-')}<br/>
                              <b>URL produs:</b> <a href="${escapeXML(prod.url || '')}">${escapeXML(prod.url || '')}</a><br/>
                              <b>Număr recenzii:</b> ${prod.reviewsCount || 0}<br/>
                              <b>Stele:</b> ${prod.stars || '-'}<br/>
                              <b>În stoc:</b> ${prod.inStock ? 'Da' : 'Nu'}<br/>
                              <b>Descriere:</b> ${escapeXML(prod.description || '-')}<br/>
                              <b>Caracteristici:</b> ${(prod.features && prod.features.length) ? prod.features.map(escapeXML).join('; ') : '-'}<br/>
                              <b>Imagine:</b> ${prod.image ? `<img src="${prod.image}" style="max-width:120px;max-height:100px;" />` : '-'}<br/>
                            ]]></description>
                            <pubDate>${new Date(prod.createdAt).toUTCString()}</pubDate>
                          </item>
                        `;
                        });

                        rss += `
                </channel>
                </rss>`;

                        res.writeHead(200, { 'Content-Type': 'application/rss+xml; charset=utf-8' });
                        res.end(rss);

                    } catch (err) {
                        console.error('Eroare la generarea RSS:', err);
                        res.writeHead(500, { 'Content-Type': 'text/plain' });
                        res.end('Eroare la generarea RSS');
                    }
                }
                else if (pathName === '/api/check-admin-exists') {
                    securityHeaders(req, res, async () => {
                        try {
                            const adminCount = await User.countDocuments({ role: 'admin' });
                            res.writeHead(200, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({
                                success: true,
                                exists: adminCount > 0
                            }));
                        } catch (error) {
                            console.error('Eroare la verificarea existenței admin:', error);
                            res.writeHead(500, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({
                                success: false,
                                message: 'Eroare internă server'
                            }));
                        }
                    });
                }
                else if (pathName === '/rss/recommended-products.xml') {
                    try {
                        const username = parsedUrl.query.username;
                        let filter = { $and: [] };

                        if (username) {
                            const user = await User.findOne({ username: username });
                            if (user && user.preferences) {

                                if (user.preferences.categories && user.preferences.categories.length) {
                                    filter.$and.push({
                                        $or: user.preferences.categories.map(cat => ({
                                            category: { $regex: new RegExp(`^${cat}$`, 'i') }
                                        }))
                                    });
                                }

                                if (user.preferences.brands && user.preferences.brands.length) {
                                    filter.$and.push({
                                        $or: user.preferences.brands.map(b => ({
                                            brand: { $regex: new RegExp(`^${b}$`, 'i') }
                                        }))
                                    });
                                }

                                if (user.preferences.priceRange) {
                                    let priceQuery = [];
                                    const p = user.preferences.priceRange.trim().toLowerCase();
                                    if (p === "low") priceQuery.push({ price: { $gte: 0, $lt: 200 } });
                                    else if (p === "mid") priceQuery.push({ price: { $gte: 200, $lt: 600 } });
                                    else if (p === "high") priceQuery.push({ price: { $gte: 600 } });
                                    if (priceQuery.length)
                                        filter.$and.push({ $or: priceQuery });
                                }
                            }
                        }
                        if (!filter.$and.length) delete filter.$and;


                        const recommendedProducts = await Product.find(filter)
                            .sort({ stars: -1, reviewsCount: -1 })
                            .limit(20);

                        let rss = `<?xml version="1.0" encoding="UTF-8" ?>
                <rss version="2.0">
                <channel>
                  <title>Recomandări pentru ${escapeXML(username || 'utilizator')}</title>
                  <link>http://localhost:3004/</link>
                  <description>Feed RSS cu produse recomandate pentru ${escapeXML(username || 'utilizator')}</description>
                  <language>ro-ro</language>
                `;

                        recommendedProducts.forEach(prod => {
                            rss += `
                  <item>
                    <title>${escapeXML(prod.name)}</title>
                    <link>http://localhost:3004/products/${prod._id}</link>
                    <description><![CDATA[
                <b>Brand:</b> ${escapeXML(prod.brand || '-')}<br/>
                <b>Model:</b> ${escapeXML(prod.model || '-')}<br/>
                <b>Preț:</b> ${prod.price ? prod.price + ' ' + (prod.currency || '') : '-'}<br/>
                <b>Categorie:</b> ${escapeXML(prod.category || '-')}<br/>
                <b>Stele:</b> ${prod.stars || '-'}<br/>
                <b>Număr recenzii:</b> ${prod.reviewsCount || 0}<br/>
                <b>Descriere:</b> ${escapeXML(prod.description || '-')}<br/>
                <b>Imagine:</b> ${prod.image ? `<img src="${prod.image}" style="max-width:120px;max-height:100px;" />` : '-'}<br/>
                ]]></description>
                    <pubDate>${new Date(prod.createdAt).toUTCString()}</pubDate>
                  </item>
                `;
                        });

                        rss += `
                </channel>
                </rss>`;

                        res.writeHead(200, { 'Content-Type': 'application/rss+xml; charset=utf-8' });
                        res.end(rss);

                    } catch (err) {
                        console.error('Eroare la generarea RSS recomandate:', err);
                        res.writeHead(500, { 'Content-Type': 'text/plain' });
                        res.end('Eroare la generarea RSS recomandate');
                    }
                }
                else if (pathName === '/api/activity') {
                    try {
                        const activities = await Activity.find().sort({ time: -1 }).limit(20);
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({
                            success: true,
                            activities
                        }));
                    } catch (err) {
                        res.writeHead(500, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({
                            success: false,
                            message: 'Eroare la încărcarea activităților'
                        }));
                    }
                    return;
                }
                else if (pathName === '/api/users') {
                    securityHeaders(req, res, async () => {
                        verifyToken(req, res, async () => {
                            isAdmin(req, res, async () => {
                                try {
                                    const users = await User.find({}, '-password');
                                    const total = await User.countDocuments();

                                    res.writeHead(200, { 'Content-Type': 'application/json' });
                                    res.end(JSON.stringify({
                                        success: true,
                                        users,
                                        total
                                    }));
                                } catch (error) {
                                    console.error('Eroare la obținerea utilizatorilor:', error);
                                    res.writeHead(500, { 'Content-Type': 'application/json' });
                                    res.end(JSON.stringify({
                                        success: false,
                                        message: 'Eroare internă server'
                                    }));
                                }
                            });
                        });
                    });
                }

                else if (pathName === '/api/profile/preferences') {
                    securityHeaders(req, res, async () => {
                        verifyToken(req, res, async () => {
                            if (!req.user) {
                                res.writeHead(401, { 'Content-Type': 'application/json' });
                                res.end(JSON.stringify({ success: false, message: 'Neautentificat' }));
                                return;
                            }
                            const user = await User.findById(req.user.id);
                            if (!user) {
                                res.writeHead(404, { 'Content-Type': 'application/json' });
                                res.end(JSON.stringify({ success: false, message: 'User inexistent!' }));
                                return;
                            }
                            res.writeHead(200, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ success: true, preferences: user.preferences || {} }));
                        });
                    });
                }

                else if (pathName === '/api/profile') {
                    securityHeaders(req, res, async () => {
                        verifyToken(req, res, async () => {
                            if (!req.user) {
                                res.writeHead(401, { 'Content-Type': 'application/json' });
                                res.end(JSON.stringify({ success: false, message: 'Neautentificat' }));
                                return;
                            }
                            const userDB = await User.findById(req.user.id);

                            res.writeHead(200, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({
                                success: true,
                                user: {
                                    username: userDB.username,
                                    email: userDB.email,
                                    role: userDB.role,
                                    avatar: userDB.avatar || null,
                                    createdAt: userDB.createdAt ? new Date(userDB.createdAt).toISOString() : null,
                                    lastLogin: userDB.lastLogin ? new Date(userDB.lastLogin).toISOString() : null,
                                    preferences: userDB.preferences || {}
                                }
                            }));
                        });
                    });
                }
                else if (pathName === '/api/products') {
                    securityHeaders(req, res, async () => {
                        try {
                            const { category, brand, price, sort, limit = 20, page = 1, search } = parsedUrl.query;

                            console.log('category:', category, typeof category);
                            console.log('brand:', brand, typeof brand);
                            console.log('price:', price, typeof price);

                            const cats = category ? category.split(',').map(cat => cat.trim()).filter(Boolean) : [];
                            console.log('cats:', cats);

                            const brandsArr = brand ? brand.split(',').map(b => b.trim()).filter(Boolean) : [];
                            console.log('brandsArr:', brandsArr);

                            const filter = { $and: [] };

                            if (category) {
                                const cats = category.split(',').map(cat => cat.trim()).filter(Boolean);
                                if (cats.length) {
                                    filter.$and.push({
                                        $or: cats.map(cat => ({
                                            category: { $regex: new RegExp(`^${cat}$`, 'i') }
                                        }))
                                    });
                                }
                            }

                            if (brand) {
                                const brandsArr = brand.split(',').map(b => b.trim()).filter(Boolean);
                                if (brandsArr.length) {
                                    filter.$and.push({
                                        $or: brandsArr.map(b => ({
                                            brand: { $regex: new RegExp(`^${b}$`, 'i') }
                                        }))
                                    });
                                }
                            }

                            if (price) {
                                let priceQuery = [];
                                for (const p of price.split(',').map(p => p.trim().toLowerCase())) {
                                    if (p === "low") priceQuery.push({ price: { $gte: 0, $lt: 200 } });
                                    else if (p === "mid") priceQuery.push({ price: { $gte: 200, $lt: 600 } });
                                    else if (p === "high") priceQuery.push({ price: { $gte: 600 } });
                                }
                                if (priceQuery.length)
                                    filter.$and.push({ $or: priceQuery });
                            }

                            if (!filter.$and.length) delete filter.$and;

                            const { normalizeSearchTerm, getSynonyms, buildSearchPipeline } = require('./utils/searchEnhancer');
                            const normalizedSearch = normalizeSearchTerm(search);
                            const synonyms = getSynonyms(normalizedSearch);

                            const pipeline = synonyms.length > 0
                                ? buildSearchPipeline(synonyms, filter)
                                : [{ $match: filter }];

                            let products1 = await mongoose.connection.db.collection('products').aggregate(pipeline).toArray();
                            let products2 = await mongoose.connection.db.collection('amazonproducts').aggregate(pipeline).toArray();
                            let products = [...products1, ...products2];

                            for (let i = products.length - 1; i > 0; i--) {
                                const j = Math.floor(Math.random() * (i + 1));
                                [products[i], products[j]] = [products[j], products[i]];
                            }

                            if (products.length === 0 && synonyms.length > 0) {
                                const fallbackPipeline = [
                                    {
                                        $match: {
                                            $or: synonyms.map(term => ({
                                                $or: [
                                                    { name: { $regex: term, $options: 'i' } },
                                                    { brand: { $regex: term, $options: 'i' } },
                                                    { category: { $regex: term, $options: 'i' } }
                                                ]
                                            }))
                                        }
                                    }
                                ];
                                const fb1 = await mongoose.connection.db.collection('products').aggregate(fallbackPipeline).toArray();
                                const fb2 = await mongoose.connection.db.collection('amazonproducts').aggregate(fallbackPipeline).toArray();
                                products = [...fb1, ...fb2];
                                for (let i = products.length - 1; i > 0; i--) {
                                    const j = Math.floor(Math.random() * (i + 1));
                                    [products[i], products[j]] = [products[j], products[i]];
                                }
                            }

                            if (sort) {
                                const [field, order] = sort.split(':');
                                products = products.sort((a, b) => {
                                    if (!a[field] || !b[field]) return 0;
                                    if (order === 'desc') return b[field] > a[field] ? 1 : -1;
                                    return a[field] > b[field] ? 1 : -1;
                                });
                            } else if (search) {
                                const lowerTerms = synonyms.map(t => t.toLowerCase());
                                products = products.map(p => {
                                    let score = 0;
                                    const fields = [p.name, p.title, p.description, p.brand, p.category];
                                    for (const field of fields) {
                                        if (!field) continue;
                                        const text = field.toLowerCase();
                                        for (const term of lowerTerms) {
                                            if (text.includes(term)) score += 2;
                                            else if (text.split(' ').some(w => w.startsWith(term))) score += 1;
                                        }
                                    }
                                    return { ...p, _score: score };
                                }).sort((a, b) => b._score - a._score);
                            }

                            const total = products.length;
                            const pageInt = parseInt(page);
                            const limitInt = parseInt(limit);
                            const paginated = products.slice((pageInt - 1) * limitInt, pageInt * limitInt);

                            res.writeHead(200, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({
                                success: true,
                                total,
                                page: pageInt,
                                limit: limitInt,
                                totalPages: Math.ceil(total / limitInt),
                                products: paginated
                            }));
                        } catch (error) {
                            console.error('Eroare la extragerea produselor:', error);
                            res.writeHead(500, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({
                                success: false,
                                message: 'Eroare la extragerea produselor',
                                error: error.message
                            }));
                        }
                    });
                }

                else if (pathName.match(/^\/api\/products\/[a-zA-Z0-9]+\/recommendations$/)) {
                    const productId = pathName.split('/')[3];
                    const { getSimilarProducts } = require('./services/recommendationService');
                    const recommended = await getSimilarProducts(productId);

                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({
                        success: true,
                        recommendations: recommended
                    }));
                }
                else if (pathName === '/api/products/stats') {
                    securityHeaders(req, res, async () => {
                        try {
                            const topProducts = await mongoose.connection.db.collection('products')
                                .find({})
                                .sort({ reviewsCount: -1 })
                                .limit(5)
                                .project({ name: 1, reviewsCount: 1, category: 1, brand: 1, _id: 0 })
                                .toArray();

                            const categoriesAgg = await mongoose.connection.db.collection('products').aggregate([
                                { $group: { _id: "$category", count: { $sum: 1 } } },
                                { $sort: { count: -1 } }
                            ]).toArray();

                            const categoryMap = {};
                            categoriesAgg.forEach(cat => {
                                if (!cat._id) return;
                                let norm = cat._id.trim().toLowerCase();

                                if (["laptopuri", "laptop", "laptops"].includes(norm)) norm = "laptop";
                                if (["telefoane", "telefon", "phones"].includes(norm)) norm = "telefon";
                                if (["tablete", "tablet", "tablets"].includes(norm)) norm = "tabletă";
                                if (["smartwatch-uri", "smartwatch", "ceasuri"].includes(norm)) norm = "smartwatch";
                                if (["componente pc", "componentă pc", "pc components"].includes(norm)) norm = "componente pc";
                                if (["periferice", "periferic", "peripherals"].includes(norm)) norm = "periferice";
                                if (["audio", "sunet"].includes(norm)) norm = "audio";
                                if (["drone", "dronă"].includes(norm)) norm = "dronă";
                                if (["altele", "other", "diverse"].includes(norm)) norm = "altele";

                                let displayName = norm.charAt(0).toUpperCase() + norm.slice(1);

                                if (categoryMap[norm]) {
                                    categoryMap[norm].count += cat.count;
                                } else {
                                    categoryMap[norm] = {
                                        _id: displayName,
                                        count: cat.count
                                    };
                                }
                            });
                            const categoriesNormalized = Object.values(categoryMap);

                            const allowedColors = [
                                "Black", "White", "Silver", "Gray", "Blue", "Red", "Green", "Pink", "Gold", "Yellow", "Purple", "Orange",
                                "Brown", "Beige", "Cyan", "Violet", "Rose", "Mint", "Cream", "Graphite", "Obsidian", "Teal", "Bronze", "Multicolor"
                            ];
                            const colorsAgg = await mongoose.connection.db.collection('products').aggregate([
                                { $group: { _id: "$color", count: { $sum: 1 } } },
                                { $sort: { count: -1 } }
                            ]).toArray();
                            const filteredColors = colorsAgg.filter(c => allowedColors.includes(c._id));

                            res.writeHead(200, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({
                                success: true,
                                topProducts,
                                categories: categoriesNormalized,
                                colors: filteredColors
                            }));
                        } catch (error) {
                            console.error('Eroare la statistici produse:', error);
                            res.writeHead(500, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({
                                success: false,
                                message: 'Eroare la extragerea statisticilor',
                                error: error.message
                            }));
                        }
                    });
                }
                else if (pathName.startsWith('/api/products/') && pathName.split('/').length === 4) {
                    securityHeaders(req, res, async () => {
                        try {
                            const id = pathName.split('/')[3];
                            const product = await Product.findById(id);

                            if (!product) {
                                res.writeHead(404, { 'Content-Type': 'application/json' });
                                res.end(JSON.stringify({
                                    success: false,
                                    message: 'Produsul nu a fost găsit'
                                }));
                                return;
                            }

                            res.writeHead(200, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ success: true, product }));
                        } catch (error) {
                            console.error('Eroare la extragerea produsului:', error);
                            res.writeHead(500, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({
                                success: false,
                                message: 'Eroare la extragerea produsului',
                                error: error.message
                            }));
                        }
                    });
                }
                else if (pathName === '/api/sources') {
                    securityHeaders(req, res, async () => {
                        try {
                            const { type, active, sort, limit = 20, page = 1 } = parsedUrl.query;
                            const filters = {};
                            if (type) filters.type = type;
                            if (active !== undefined) filters.active = active === 'true';
                            const options = {
                                limit: parseInt(limit),
                                page: parseInt(page)
                            };
                            if (sort) {
                                const [field, order] = sort.split(':');
                                options.sort = { [field]: order === 'desc' ? -1 : 1 };
                            }

                            const sources = await sourceService.getSources(filters, options);
                            const totalSources = await Source.countDocuments(filters);

                            res.writeHead(200, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({
                                success: true,
                                total: totalSources,
                                page: parseInt(page),
                                limit: parseInt(limit),
                                totalPages: Math.ceil(totalSources / parseInt(limit)),
                                sources
                            }));
                        } catch (error) {
                            console.error('Eroare la preluarea surselor:', error);
                            res.writeHead(500, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({
                                success: false,
                                message: 'Eroare la preluarea surselor',
                                error: error.message
                            }));
                        }
                    });
                } else if (pathName.match(/^\/api\/sources\/[a-zA-Z0-9]+$/)) {
                    securityHeaders(req, res, async () => {
                        try {
                            const id = pathName.split('/')[3];
                            const source = await sourceService.getSourceById(id);

                            if (!source) {
                                res.writeHead(404, { 'Content-Type': 'application/json' });
                                res.end(JSON.stringify({
                                    success: false,
                                    message: 'Sursa nu a fost găsită'
                                }));
                                return;
                            }

                            res.writeHead(200, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({
                                success: true,
                                source
                            }));
                        } catch (error) {
                            console.error('Eroare la preluarea sursei:', error);
                            res.writeHead(500, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({
                                success: false,
                                message: 'Eroare la preluarea sursei',
                                error: error.message
                            }));
                        }
                    });
                } else if (pathName.match(/^\/api\/sources\/by-type\/[a-zA-Z]+$/)) {
                    securityHeaders(req, res, async () => {
                        try {
                            const type = pathName.split('/')[4];
                            const validTypes = ['rss', 'api', 'scraping', 'manual'];
                            if (!validTypes.includes(type)) {
                                res.writeHead(400, { 'Content-Type': 'application/json' });
                                res.end(JSON.stringify({
                                    success: false,
                                    message: 'Tip de sursă invalid'
                                }));
                                return;
                            }

                            const sources = await sourceService.getSourcesByType(type);

                            res.writeHead(200, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({
                                success: true,
                                sources
                            }));
                        } catch (error) {
                            console.error(`Eroare la preluarea surselor de tip ${type}:`, error);
                            res.writeHead(500, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({
                                success: false,
                                message: 'Eroare la preluarea surselor',
                                error: error.message
                            }));
                        }
                    });
                }
                else if (pathName === '/api/news') {
                    securityHeaders(req, res, async () => {
                        try {
                            const {
                                source,
                                category,
                                search,
                                sort = 'publishDate:desc',
                                limit = 20,
                                page = 1
                            } = parsedUrl.query;

                            const filters = {};
                            if (source) filters.source = source;
                            if (category) filters.categories = category;

                            const options = {
                                limit: parseInt(limit),
                                page: parseInt(page)
                            };

                            if (sort) {
                                const [field, order] = sort.split(':');
                                options.sort = { [field]: order === 'desc' ? -1 : 1 };
                            }

                            let news;
                            let totalNews;

                            if (search) {
                                news = await newsService.searchNews(search, options);
                                totalNews = news.length;
                            } else {
                                news = await newsService.getNews(filters, options);
                                totalNews = await News.countDocuments(filters);
                            }

                            res.writeHead(200, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({
                                success: true,
                                total: totalNews,
                                page: parseInt(page),
                                limit: parseInt(limit),
                                totalPages: Math.ceil(totalNews / parseInt(limit)),
                                news
                            }));
                        } catch (error) {
                            console.error('Eroare la preluarea știrilor:', error);
                            res.writeHead(500, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({
                                success: false,
                                message: 'Eroare la preluarea știrilor',
                                error: error.message
                            }));
                        }
                    });
                }
                else if (pathName.match(/^\/api\/news\/[a-zA-Z0-9]+$/)) {
                    securityHeaders(req, res, async () => {
                        try {
                            const id = pathName.split('/')[3];
                            const news = await newsService.getNewsById(id);

                            if (!news) {
                                res.writeHead(404, { 'Content-Type': 'application/json' });
                                res.end(JSON.stringify({
                                    success: false,
                                    message: 'Știrea nu a fost găsită'
                                }));
                                return;
                            }

                            res.writeHead(200, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({
                                success: true,
                                news
                            }));
                        } catch (error) {
                            console.error('Eroare la preluarea știrii:', error);
                            res.writeHead(500, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({
                                success: false,
                                message: 'Eroare la preluarea știrii',
                                error: error.message
                            }));
                        }
                    });
                }
                else if (pathName.match(/^\/api\/news\/latest\/\d+$/)) {
                    securityHeaders(req, res, async () => {
                        try {
                            const limit = parseInt(pathName.split('/')[4]) || 10;
                            const news = await newsService.getLatestNews(limit);

                            res.writeHead(200, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({
                                success: true,
                                count: news.length,
                                news
                            }));
                        } catch (error) {
                            console.error('Eroare la preluarea celor mai recente știri:', error);
                            res.writeHead(500, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({
                                success: false,
                                message: 'Eroare la preluarea celor mai recente știri',
                                error: error.message
                            }));
                        }
                    });
                }
                else if (pathName.match(/^\/api\/news\/by-source\/[a-zA-Z0-9]+$/)) {
                    securityHeaders(req, res, async () => {
                        try {
                            const sourceId = pathName.split('/')[4];
                            const { limit = 20, page = 1 } = parsedUrl.query;

                            const options = {
                                limit: parseInt(limit),
                                page: parseInt(page),
                                sort: { publishDate: -1 }
                            };

                            const news = await newsService.getNewsBySource(sourceId, options);
                            const totalNews = await News.countDocuments({ source: sourceId });

                            res.writeHead(200, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({
                                success: true,
                                total: totalNews,
                                page: parseInt(page),
                                limit: parseInt(limit),
                                totalPages: Math.ceil(totalNews / parseInt(limit)),
                                news
                            }));
                        } catch (error) {
                            console.error('Eroare la preluarea știrilor după sursă:', error);
                            res.writeHead(500, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({
                                success: false,
                                message: 'Eroare la preluarea știrilor după sursă',
                                error: error.message
                            }));
                        }
                    });
                }
                else if (pathName.match(/^\/api\/news\/by-category\/[a-zA-Z0-9-]+$/)) {
                    securityHeaders(req, res, async () => {
                        try {
                            const category = pathName.split('/')[4];
                            const { limit = 20, page = 1 } = parsedUrl.query;

                            const options = {
                                limit: parseInt(limit),
                                page: parseInt(page),
                                sort: { publishDate: -1 }
                            };

                            const news = await newsService.getNewsByCategory(category, options);
                            const totalNews = await News.countDocuments({ categories: category });

                            res.writeHead(200, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({
                                success: true,
                                total: totalNews,
                                page: parseInt(page),
                                limit: parseInt(limit),
                                totalPages: Math.ceil(totalNews / parseInt(limit)),
                                news
                            }));
                        } catch (error) {
                            console.error('Eroare la preluarea știrilor după categorie:', error);
                            res.writeHead(500, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({
                                success: false,
                                message: 'Eroare la preluarea știrilor după categorie',
                                error: error.message
                            }));
                        }
                    });
                }
                else if (pathName === '/api/news/categories') {
                    securityHeaders(req, res, async () => {
                        try {
                            const categories = await News.distinct('categories');

                            res.writeHead(200, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({
                                success: true,
                                categories: categories.filter(cat => cat)
                            }));
                        } catch (error) {
                            console.error('Eroare la obținerea categoriilor de știri:', error);
                            res.writeHead(500, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({
                                success: false,
                                message: 'Eroare la obținerea categoriilor de știri',
                                error: error.message
                            }));
                        }
                    });
                }
                else if (pathName === '/api/news/stats') {
                    securityHeaders(req, res, async () => {
                        try {
                            const stats = await newsService.getNewsStats();

                            res.writeHead(200, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({
                                success: true,
                                stats: {
                                    totalNews: stats.totalCount || 0,
                                    processedNews: stats.processedCount || 0,
                                    processedPercentage: stats.processedPercentage || 0,
                                    sources: stats.sourcesCount || 0,
                                    categories: stats.categoriesStats?.length || 0,
                                    topCategories: stats.categoriesStats || []
                                }
                            }));
                        } catch (error) {
                            console.error('Eroare la obținerea statisticilor despre știri:', error);
                            res.writeHead(500, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({
                                success: false,
                                message: 'Eroare la obținerea statisticilor despre știri',
                                error: error.message
                            }));
                        }
                    });
                }
                else if (pathName === '/api/rss/stats') {
                    securityHeaders(req, res, async () => {
                        verifyToken(req, res, async () => {
                            try {
                                const stats = await rssService.getRssSourcesStats();

                                res.writeHead(200, { 'Content-Type': 'application/json' });
                                res.end(JSON.stringify({
                                    success: true,
                                    stats
                                }));
                            } catch (error) {
                                console.error('Eroare la obținerea statisticilor despre sursele RSS:', error);
                                res.writeHead(500, { 'Content-Type': 'application/json' });
                                res.end(JSON.stringify({
                                    success: false,
                                    message: 'Eroare la obținerea statisticilor despre sursele RSS',
                                    error: error.message
                                }));
                            }
                        });
                    });
                }
                else if (pathName === '/api/news/distribution') {
                    securityHeaders(req, res, async () => {
                        verifyToken(req, res, async () => {
                            try {
                                const report = await newsService.getSourcesDistributionReport();

                                res.writeHead(200, { 'Content-Type': 'application/json' });
                                res.end(JSON.stringify({
                                    success: true,
                                    report
                                }));
                            } catch (error) {
                                console.error('Eroare la obținerea raportului de distribuție:', error);
                                res.writeHead(500, { 'Content-Type': 'application/json' });
                                res.end(JSON.stringify({
                                    success: false,
                                    message: 'Eroare la obținerea raportului de distribuție',
                                    error: error.message
                                }));
                            }
                        });
                    });
                }
                else if (pathName === '/api/rss/schedule') {
                    securityHeaders(req, res, async () => {
                        verifyToken(req, res, async () => {
                            isAdmin(req, res, async () => {
                                try {
                                    res.writeHead(200, { 'Content-Type': 'application/json' });
                                    res.end(JSON.stringify({
                                        success: true,
                                        message: 'Job-uri programate pentru RSS',
                                        jobs: [
                                            {
                                                name: 'rssFeedUpdate',
                                                description: 'Verifică sursele RSS pentru actualizare',
                                                schedule: '*/10 * * * *'
                                            },
                                            {
                                                name: 'cleanOldNews',
                                                description: 'Curăță știrile vechi neprocesate',
                                                schedule: '0 3 * * *'
                                            }
                                        ]
                                    }));
                                } catch (error) {
                                    console.error('Eroare la obținerea stării job-urilor programate:', error);
                                    res.writeHead(500, { 'Content-Type': 'application/json' });
                                    res.end(JSON.stringify({
                                        success: false,
                                        message: 'Eroare la obținerea stării job-urilor programate',
                                        error: error.message
                                    }));
                                }
                            });
                        });
                    });
                }
                else if (pathName === '/api/feed/products') {
                    securityHeaders(req, res, async () => {
                        try {
                            const { limit = 20, category } = parsedUrl.query;

                            const filter = {};
                            if (category) filter.category = category;

                            const products = await Product.find(filter)
                                .sort({ createdAt: -1 })
                                .limit(parseInt(limit));

                            const baseUrl = `http://${req.headers.host || 'localhost:3000'}`;
                            const rssFeedGenerator = require('./services/rssFeedGeneratorService');
                            const xmlFeed = await rssFeedGenerator.generateProductRssFeed(
                                products,
                                'ElectroRecommender - Produse Recomandate',
                                'Feed RSS cu cele mai recente produse electronice recomandate',
                                baseUrl
                            );

                            res.writeHead(200, { 'Content-Type': 'application/rss+xml; charset=utf-8' });
                            res.end(xmlFeed);
                        } catch (error) {
                            console.error('Eroare la generarea feed-ului RSS pentru produse:', error);
                            res.writeHead(500, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({
                                success: false,
                                message: 'Eroare la generarea feed-ului RSS',
                                error: error.message
                            }));
                        }
                    });
                }
                else if (pathName === '/api/feed/news') {
                    securityHeaders(req, res, async () => {
                        try {
                            const { limit = 20, category, source } = parsedUrl.query;

                            const filter = {};
                            if (category) filter.categories = category;
                            if (source) filter.source = source;

                            const news = await News.find(filter)
                                .sort({ publishDate: -1 })
                                .limit(parseInt(limit));

                            const baseUrl = `http://${req.headers.host || 'localhost:3000'}`;
                            const rssFeedGenerator = require('./services/rssFeedGeneratorService');
                            const xmlFeed = await rssFeedGenerator.generateNewsRssFeed(
                                news,
                                'ElectroRecommender - Știri Tech',
                                'Cele mai recente știri despre dispozitive electronice',
                                baseUrl
                            );

                            res.writeHead(200, { 'Content-Type': 'application/rss+xml; charset=utf-8' });
                            res.end(xmlFeed);
                        } catch (error) {
                            console.error('Eroare la generarea feed-ului RSS pentru știri:', error);
                            res.writeHead(500, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({
                                success: false,
                                message: 'Eroare la generarea feed-ului RSS',
                                error: error.message
                            }));
                        }
                    });
                }
                                else if (pathName.match(/\.(css|js|png|jpg|jpeg|gif|svg)$/)) {
                                    const extname = path.extname(pathName);
                                    let contentType = 'text/html';

                                    switch (extname) {
                                        case '.css': contentType = 'text/css'; break;
                                        case '.js': contentType = 'text/javascript'; break;
                                        case '.png': contentType = 'image/png'; break;
                                        case '.jpg': contentType = 'image/jpg'; break;
                                        case '.jpeg': contentType = 'image/jpeg'; break;
                                        case '.gif': contentType = 'image/gif'; break;
                                        case '.svg': contentType = 'image/svg+xml'; break;
                                    }

                                    serveStaticFile(req, res, path.join(__dirname, `../frontend${pathName}`), contentType);
                                } else {
                                    securityHeaders(req, res, () => {
                                        res.writeHead(404, { 'Content-Type': 'text/plain' });
                                        res.end('404 - Not Found');
                                    });
                                }
                            } else if (method === 'POST') {
                                if (pathName === '/api/login') {
                                    securityHeaders(req, res, async () => {
                                        try {
                                            const credentials = await parseRequestBody(req);

                                            if (!credentials.username || !credentials.password) {
                                                res.writeHead(400, { 'Content-Type': 'application/json' });
                                                res.end(JSON.stringify({
                                                    success: false,
                                                    message: 'Username și parolă necesare'
                                                }));
                                                return;
                                            }

                                            const result = await authService.authenticate(
                                                sanitizeText(credentials.username),
                                                credentials.password
                                            );

                                            if (result.success) {
                                                await Activity.create({
                                                        type: 'user',
                                                        icon: 'fas fa-sign-in-alt',
                                                        title: 'Autentificare',
                                                        description: `Utilizatorul "${credentials.username}" s-a autentificat în sistem.`
                                                    });
                                                res.writeHead(200, { 'Content-Type': 'application/json' });
                                                res.end(JSON.stringify(result));
                                            } else {
                                                res.writeHead(401, { 'Content-Type': 'application/json' });
                                                res.end(JSON.stringify(result));
                                            }
                                        } catch (err) {
                                            console.error('Eroare la procesarea cererii de login:', err);
                                            res.writeHead(400, { 'Content-Type': 'application/json' });
                                            res.end(JSON.stringify({
                                                success: false,
                                                message: 'Date invalide'
                                            }));
                                        }
                                    });
                                }
                                else if (pathName === '/api/profile/preferences') {
                                    securityHeaders(req, res, async () => {
                                        verifyToken(req, res, async () => {
                                            if (!req.user) {
                                                res.writeHead(401, { 'Content-Type': 'application/json' });
                                                res.end(JSON.stringify({ success: false, message: 'Neautentificat' }));
                                                return;
                                            }
                                            try {
                                                const { categories, priceRange, brands } = await parseRequestBody(req);
                                                const user = await User.findById(req.user.id);
                                                user.preferences = { categories, priceRange, brands };
                                                await user.save();
                                                res.writeHead(200, { 'Content-Type': 'application/json' });
                                                res.end(JSON.stringify({ success: true }));
                                            } catch (err) {
                                                res.writeHead(500, { 'Content-Type': 'application/json' });
                                                res.end(JSON.stringify({ success: false, message: 'Eroare la salvare preferințe.' }));
                                            }
                                        });
                                    });
                                }
                                else if (pathName === '/api/profile/avatar') {
                                    securityHeaders(req, res, async () => {
                                        verifyToken(req, res, async () => {
                                            if (!req.user) {
                                                res.writeHead(401, { 'Content-Type': 'application/json' });
                                                res.end(JSON.stringify({ success: false, message: 'Neautentificat' }));
                                                return;
                                            }
                                            try {
                                                const { avatar } = await parseRequestBody(req);
                                                if (!avatar || typeof avatar !== 'string' || !avatar.startsWith('http')) {
                                                    res.writeHead(400, { 'Content-Type': 'application/json' });
                                                    res.end(JSON.stringify({ success: false, message: 'Link invalid!' }));
                                                    return;
                                                }
                                                const user = await User.findById(req.user.id);
                                                if (!user) {
                                                    res.writeHead(404, { 'Content-Type': 'application/json' });
                                                    res.end(JSON.stringify({ success: false, message: 'Utilizator inexistent.' }));
                                                    return;
                                                }
                                                user.avatar = avatar;
                                                await user.save();
                                                await Activity.create({
                                                    type: 'update',
                                                    icon: 'fas fa-user-circle',
                                                    title: 'Avatar schimbat',
                                                    description: `Utilizatorul "${user.username}" și-a schimbat avatarul.`
                                                });
                                                res.writeHead(200, { 'Content-Type': 'application/json' });
                                                res.end(JSON.stringify({ success: true, message: 'Avatar actualizat!' }));
                                            } catch (error) {
                                                res.writeHead(500, { 'Content-Type': 'application/json' });
                                                res.end(JSON.stringify({ success: false, message: 'Eroare la schimbarea avatarului.' }));
                                            }
                                        });
                                    });
                                }
                                else if (pathName === '/api/profile/password') {
                                    securityHeaders(req, res, async () => {
                                        verifyToken(req, res, async () => {
                                            if (!req.user) {
                                                res.writeHead(401, { 'Content-Type': 'application/json' });
                                                res.end(JSON.stringify({ success: false, message: 'Neautentificat' }));
                                                return;
                                            }
                                            try {
                                                const { currentPassword, newPassword } = await parseRequestBody(req);
                                                if (!currentPassword || !newPassword) {
                                                    res.writeHead(400, { 'Content-Type': 'application/json' });
                                                    res.end(JSON.stringify({ success: false, message: 'Toate câmpurile sunt obligatorii.' }));
                                                    return;
                                                }
                                                const user = await User.findById(req.user.id);
                                                if (!user) {
                                                    res.writeHead(404, { 'Content-Type': 'application/json' });
                                                    res.end(JSON.stringify({ success: false, message: 'Utilizator inexistent.' }));
                                                    return;
                                                }
                                                const valid = await user.comparePassword(currentPassword);
                                                if (!valid) {
                                                    res.writeHead(400, { 'Content-Type': 'application/json' });
                                                    res.end(JSON.stringify({ success: false, message: 'Parola veche este greșită.' }));
                                                    return;
                                                }
                                                user.password = newPassword;
                                                await user.save();
                                                await Activity.create({
                                                    type: 'update',
                                                    icon: 'fas fa-key',
                                                    title: 'Parolă schimbată',
                                                    description: `Utilizatorul "${user.username}" și-a schimbat parola.`
                                                });
                                                res.writeHead(200, { 'Content-Type': 'application/json' });
                                                res.end(JSON.stringify({ success: true, message: 'Parola a fost schimbată cu succes.' }));
                                            } catch (error) {
                                                res.writeHead(500, { 'Content-Type': 'application/json' });
                                                res.end(JSON.stringify({ success: false, message: 'Eroare la schimbarea parolei.' }));
                                            }
                                        });
                                    });
                                }
                                else if (pathName === '/api/register') {
                                    securityHeaders(req, res, async () => {
                                        try {
                                            const userData = await parseRequestBody(req);

                                            if (!userData.username || !userData.password) {
                                                res.writeHead(400, { 'Content-Type': 'application/json' });
                                                res.end(JSON.stringify({
                                                    success: false,
                                                    message: 'Username și parolă necesare'
                                                }));
                                                return;
                                            }

                                            if (userData.role === 'admin') {
                                                const adminCount = await User.countDocuments({ role: 'admin' });

                                                if (adminCount > 0) {
                                                    res.writeHead(403, { 'Content-Type': 'application/json' });
                                                    res.end(JSON.stringify({
                                                        success: false,
                                                        message: 'Înregistrarea administratorilor este restricționată. Contactați un administrator existent.'
                                                    }));
                                                    return;
                                                }
                                            }

                                            const result = await authService.registerUser({
                                                username: sanitizeText(userData.username),
                                                password: userData.password,
                                                email: userData.email ? sanitizeText(userData.email) : undefined,
                                                role: userData.role === 'admin' ? 'admin' : 'member'
                                            });

                                            if (result.success) {
                                                await Activity.create({
                                                    type: 'user',
                                                    icon: 'fas fa-user-plus',
                                                    title: 'Utilizator nou înregistrat',
                                                    description: `Utilizatorul "${userData.username}" a fost creat.`
                                                });
                                                res.writeHead(201, { 'Content-Type': 'application/json' });
                                                res.end(JSON.stringify(result));
                                            } else {
                                                res.writeHead(400, { 'Content-Type': 'application/json' });
                                                res.end(JSON.stringify(result));
                                            }
                                        } catch (error) {
                                            console.error('Eroare la înregistrare:', error);
                                            res.writeHead(500, { 'Content-Type': 'application/json' });
                                            res.end(JSON.stringify({
                                                success: false,
                                                message: 'Eroare internă server',
                                                error: error.message
                                            }));
                                        }
                                    });
                                } else if (pathName === '/api/admin/users') {
                                    securityHeaders(req, res, async () => {
                                        try {
                                            verifyToken(req, res, async () => {
                                                isAdmin(req, res, async () => {
                                                    try {
                                                        const userData = await parseRequestBody(req);

                                                        if (!userData.username || !userData.password) {
                                                            res.writeHead(400, { 'Content-Type': 'application/json' });
                                                            res.end(JSON.stringify({
                                                                success: false,
                                                                message: 'Username și parolă necesare'
                                                            }));
                                                            return;
                                                        }
                                                        const result = await authService.registerUser({
                                                            username: sanitizeText(userData.username),
                                                            email: sanitizeText(userData.email),
                                                            password: userData.password,
                                                            role: userData.role || 'admin'
                                                        });

                                                        if (result.success) {
                                                            res.writeHead(201, { 'Content-Type': 'application/json' });
                                                            res.end(JSON.stringify(result));
                                                        } else {
                                                            res.writeHead(400, { 'Content-Type': 'application/json' });
                                                            res.end(JSON.stringify(result));
                                                        }
                                                    } catch (error) {
                                                        console.error('Eroare la crearea utilizatorului:', error);
                                                        res.writeHead(500, { 'Content-Type': 'application/json' });
                                                        res.end(JSON.stringify({
                                                            success: false,
                                                            message: 'Eroare internă server'
                                                        }));
                                                    }
                                                });
                                            });
                                        } catch (error) {
                                            console.error('Eroare middleware autentificare:', error);
                                            res.writeHead(500, { 'Content-Type': 'application/json' });
                                            res.end(JSON.stringify({
                                                success: false,
                                                message: 'Eroare internă server'
                                            }));
                                        }
                                    });
                                } else if (pathName === '/api/products') {
                                    securityHeaders(req, res, async () => {
                                        try {
                                            verifyToken(req, res, async () => {
                                                isAdmin(req, res, async () => {
                                                    try {
                                                        const productData = await parseRequestBody(req);

                                                        const validationResult = validateProduct(productData);

                                                        if (!validationResult.isValid) {
                                                            res.writeHead(400, { 'Content-Type': 'application/json' });
                                                            res.end(JSON.stringify({
                                                                success: false,
                                                                message: 'Date produs invalide',
                                                                errors: validationResult.errors
                                                            }));
                                                            return;
                                                        }

                                                        const sanitizedProduct = {
                                                            ...productData,
                                                            name: sanitizeText(productData.name),
                                                            brand: sanitizeText(productData.brand),
                                                            model: sanitizeText(productData.model),
                                                            color: sanitizeText(productData.color),
                                                            category: sanitizeText(productData.category),
                                                            features: productData.features?.map(feature => sanitizeText(feature))
                                                        };

                                                        const newProduct = new Product(sanitizedProduct);
                                                        const savedProduct = await newProduct.save();

                                                        await Activity.create({
                                                            type: 'add',
                                                            icon: 'fas fa-plus',
                                                            title: 'Produs nou adăugat',
                                                            description: `${savedProduct.name} a fost adăugat în baza de date`
                                                        });

                                                        res.writeHead(201, { 'Content-Type': 'application/json' });
                                                        res.end(JSON.stringify({
                                                            success: true,
                                                            message: 'Produs creat cu succes',
                                                            product: savedProduct
                                                        }));
                                                    } catch (error) {
                                                        console.error('Eroare la crearea produsului:', error);
                                                        res.writeHead(500, { 'Content-Type': 'application/json' });
                                                        res.end(JSON.stringify({
                                                            success: false,
                                                            message: 'Eroare la salvarea produsului',
                                                            error: error.message
                                                        }));
                                                    }
                                                });
                                            });
                                        } catch (error) {
                                            console.error('Eroare middleware autentificare:', error);
                                            res.writeHead(500, { 'Content-Type': 'application/json' });
                                            res.end(JSON.stringify({
                                                success: false,
                                                message: 'Eroare internă server'
                                            }));
                                        }
                                    });
                                } else if (pathName === '/api/sources') {
                                    securityHeaders(req, res, async () => {
                                        try {
                                            verifyToken(req, res, async () => {
                                                isAdmin(req, res, async () => {
                                                    try {
                                                        const sourceData = await parseRequestBody(req);

                                                        if (!sourceData.name || !sourceData.type || !sourceData.url) {
                                                            res.writeHead(400, { 'Content-Type': 'application/json' });
                                                            res.end(JSON.stringify({
                                                                success: false,
                                                                message: 'Câmpurile name, type și url sunt obligatorii'
                                                            }));
                                                            return;
                                                        }

                                                        const newSource = await sourceService.createSource(sourceData);

                                                        await Activity.create({
                                                            type: 'add',
                                                            icon: 'fas fa-plus',
                                                            title: 'Sursă nouă adăugată',
                                                            description: `${newSource.name} a fost adăugată în baza de date`
                                                        });

                                                        res.writeHead(201, { 'Content-Type': 'application/json' });
                                                        res.end(JSON.stringify({
                                                            success: true,
                                                            message: 'Sursă creată cu succes',
                                                            source: newSource
                                                        }));
                                                    } catch (error) {
                                                        console.error('Eroare la crearea sursei:', error);
                                                        res.writeHead(500, { 'Content-Type': 'application/json' });
                                                        res.end(JSON.stringify({
                                                            success: false,
                                                            message: 'Eroare la crearea sursei',
                                                            error: error.message
                                                        }));
                                                    }
                                                });
                                            });
                                        } catch (error) {
                                            console.error('Eroare middleware autentificare:', error);
                                            res.writeHead(500, { 'Content-Type': 'application/json' });
                                            res.end(JSON.stringify({
                                                success: false,
                                                message: 'Eroare internă server'
                                            }));
                                        }
                                    });
                                } else if (pathName === '/api/rss/process') {
                                    securityHeaders(req, res, async () => {
                                        try {
                                            verifyToken(req, res, async () => {
                                                isAdmin(req, res, async () => {
                                                    try {
                                                        const body = await parseRequestBody(req);
                                                        let results;

                                                        if (body && body.sourceId) {
                                                            const source = await Source.findById(body.sourceId);

                                                            if (!source) {
                                                                res.writeHead(404, { 'Content-Type': 'application/json' });
                                                                res.end(JSON.stringify({
                                                                    success: false,
                                                                    message: 'Sursa nu a fost găsită'
                                                                }));
                                                                return;
                                                            }

                                                            if (source.type !== 'rss') {
                                                                res.writeHead(400, { 'Content-Type': 'application/json' });
                                                                res.end(JSON.stringify({
                                                                    success: false,
                                                                    message: 'Sursa nu este de tip RSS'
                                                                }));
                                                                return;
                                                            }

                                                            results = await rssService.processRssFeed(source);
                                                        } else {
                                                            results = await rssService.processAllRssFeeds();
                                                        }

                                                        res.writeHead(200, { 'Content-Type': 'application/json' });
                                                        res.end(JSON.stringify({
                                                            success: true,
                                                            results
                                                        }));
                                                    } catch (error) {
                                                        console.error('Eroare la procesarea feed-urilor RSS:', error);
                                                        res.writeHead(500, { 'Content-Type': 'application/json' });
                                                        res.end(JSON.stringify({
                                                            success: false,
                                                            message: 'Eroare la procesarea feed-urilor RSS',
                                                            error: error.message
                                                        }));
                                                    }
                                                });
                                            });
                                        } catch (error) {
                                            console.error('Eroare middleware autentificare:', error);
                                            res.writeHead(500, { 'Content-Type': 'application/json' });
                                            res.end(JSON.stringify({
                                                success: false,
                                                message: 'Eroare internă server'
                                            }));
                                        }
                                    });
                                } else if (pathName === '/api/rss/schedule') {
                                    securityHeaders(req, res, async () => {
                                        verifyToken(req, res, async () => {
                                            isAdmin(req, res, async () => {
                                                try {
                                                    const body = await parseRequestBody(req);

                                                    if (body.action === 'start') {
                                                        schedulerService.startJob(body.jobName);
                                                        res.writeHead(200, { 'Content-Type': 'application/json' });
                                                        res.end(JSON.stringify({
                                                            success: true,
                                                            message: `Job-ul '${body.jobName}' a fost pornit`
                                                        }));
                                                    } else if (body.action === 'stop') {
                                                        schedulerService.stopJob(body.jobName);
                                                        res.writeHead(200, { 'Content-Type': 'application/json' });
                                                        res.end(JSON.stringify({
                                                            success: true,
                                                            message: `Job-ul '${body.jobName}' a fost oprit`
                                                        }));
                                                    } else if (body.action === 'update' && body.jobName && body.cronExpression) {
                                                        schedulerService.updateJobSchedule(body.jobName, body.cronExpression);
                                                        res.writeHead(200, { 'Content-Type': 'application/json' });
                                                        res.end(JSON.stringify({
                                                            success: true,
                                                            message: `Programarea job-ului '${body.jobName}' a fost actualizată`
                                                        }));
                                                    } else {
                                                        res.writeHead(400, { 'Content-Type': 'application/json' });
                                                        res.end(JSON.stringify({
                                                            success: false,
                                                            message: 'Acțiune invalidă sau parametri lipsă'
                                                        }));
                                                    }
                                                } catch (error) {
                                                    console.error('Eroare la gestionarea job-urilor programate:', error);
                                                    res.writeHead(500, { 'Content-Type': 'application/json' });
                                                    res.end(JSON.stringify({
                                                        success: false,
                                                        message: 'Eroare la gestionarea job-urilor programate',
                                                        error: error.message
                                                    }));
                                                }
                                            });
                                        });
                                    });
                                } else {
                                    securityHeaders(req, res, () => {
                                        res.writeHead(404, { 'Content-Type': 'text/plain' });
                                        res.end('404 - Not Found');
                                    });
                                }
                            } else if (method === 'PUT') {
                                if (pathName.startsWith('/api/products/')) {
                                    securityHeaders(req, res, async () => {
                                        try {
                                            verifyToken(req, res, async () => {
                                                isAdmin(req, res, async () => {
                                                    try {
                                                        const id = pathName.split('/')[3];
                                                        const updates = await parseRequestBody(req);

                                                        const validationResult = validateProduct(updates);

                                                        if (!validationResult.isValid) {
                                                            res.writeHead(400, { 'Content-Type': 'application/json' });
                                                            res.end(JSON.stringify({
                                                                success: false,
                                                                message: 'Date produs invalide',
                                                                errors: validationResult.errors
                                                            }));
                                                            return;
                                                        }

                                                        const sanitizedUpdates = {
                                                            ...updates,
                                                            name: updates.name ? sanitizeText(updates.name) : undefined,
                                                            brand: updates.brand ? sanitizeText(updates.brand) : undefined,
                                                            model: updates.model ? sanitizeText(updates.model) : undefined,
                                                            color: updates.color ? sanitizeText(updates.color) : undefined,
                                                            category: updates.category ? sanitizeText(updates.category) : undefined,
                                                            features: updates.features?.map(feature => sanitizeText(feature))
                                                        };

                                                        const product = await Product.findByIdAndUpdate(id, sanitizedUpdates, {
                                                            new: true,
                                                            runValidators: true
                                                        });

                                                        if (!product) {
                                                            res.writeHead(404, { 'Content-Type': 'application/json' });
                                                            res.end(JSON.stringify({
                                                                success: false,
                                                                message: 'Produsul nu a fost găsit'
                                                            }));
                                                            return;
                                                        }

                                                        res.writeHead(200, { 'Content-Type': 'application/json' });
                                                        res.end(JSON.stringify({
                                                            success: true,
                                                            message: 'Produs actualizat cu succes',
                                                            product
                                                        }));
                                                    } catch (error) {
                                                        console.error('Eroare la actualizarea produsului:', error);
                                                        res.writeHead(500, { 'Content-Type': 'application/json' });
                                                        res.end(JSON.stringify({
                                                            success: false,
                                                            message: 'Eroare la actualizarea produsului',
                                                            error: error.message
                                                        }));
                                                    }
                                                });
                                            });
                                        } catch (error) {
                                            console.error('Eroare middleware autentificare:', error);
                                            res.writeHead(500, { 'Content-Type': 'application/json' });
                                            res.end(JSON.stringify({
                                                success: false,
                                                message: 'Eroare internă server'
                                            }));
                                        }
                                    });
                                } else if (pathName.match(/^\/api\/sources\/[a-zA-Z0-9]+$/)) {
                                    securityHeaders(req, res, async () => {
                                        try {
                                            verifyToken(req, res, async () => {
                                                isAdmin(req, res, async () => {
                                                    try {
                                                        const id = pathName.split('/')[3];
                                                        const updateData = await parseRequestBody(req);

                                                        const updatedSource = await sourceService.updateSource(id, updateData);

                                                        if (!updatedSource) {
                                                            res.writeHead(404, { 'Content-Type': 'application/json' });
                                                            res.end(JSON.stringify({
                                                                success: false,
                                                                message: 'Sursa nu a fost găsită'
                                                            }));
                                                            return;
                                                        }

                                                        res.writeHead(200, { 'Content-Type': 'application/json' });
                                                        res.end(JSON.stringify({
                                                            success: true,
                                                            message: 'Sursă actualizată cu succes',
                                                            source: updatedSource
                                                        }));
                                                    } catch (error) {
                                                        console.error('Eroare la actualizarea sursei:', error);
                                                        res.writeHead(500, { 'Content-Type': 'application/json' });
                                                        res.end(JSON.stringify({
                                                            success: false,
                                                            message: 'Eroare la actualizarea sursei',
                                                            error: error.message
                                                        }));
                                                    }
                                                });
                                            });
                                        } catch (error) {
                                            console.error('Eroare middleware autentificare:', error);
                                            res.writeHead(500, { 'Content-Type': 'application/json' });
                                            res.end(JSON.stringify({
                                                success: false,
                                                message: 'Eroare internă server'
                                            }));
                                        }
                                    });
                                }
                            } else if (method === 'PATCH') {
                                if (pathName.match(/^\/api\/sources\/[a-zA-Z0-9]+\/toggle-active$/)) {
                                    securityHeaders(req, res, async () => {
                                        try {
                                            verifyToken(req, res, async () => {
                                                isAdmin(req, res, async () => {
                                                    try {
                                                        const id = pathName.split('/')[3];
                                                        const { active } = await parseRequestBody(req);

                                                        if (active === undefined) {
                                                            res.writeHead(400, { 'Content-Type': 'application/json' });
                                                            res.end(JSON.stringify({
                                                                success: false,
                                                                message: 'Câmpul active este obligatoriu'
                                                            }));
                                                            return;
                                                        }

                                                        const updatedSource = await sourceService.toggleSourceActive(id, active);

                                                        if (!updatedSource) {
                                                            res.writeHead(404, { 'Content-Type': 'application/json' });
                                                            res.end(JSON.stringify({
                                                                success: false,
                                                                message: 'Sursa nu a fost găsită'
                                                            }));
                                                            return;
                                                        }

                                                        res.writeHead(200, { 'Content-Type': 'application/json' });
                                                        res.end(JSON.stringify({
                                                            success: true,
                                                            message: `Sursă ${active ? 'activată' : 'dezactivată'} cu succes`,
                                                            source: updatedSource
                                                        }));
                                                    } catch (error) {
                                                        console.error('Eroare la activarea/dezactivarea sursei:', error);
                                                        res.writeHead(500, { 'Content-Type': 'application/json' });
                                                        res.end(JSON.stringify({
                                                            success: false,
                                                            message: 'Eroare la activarea/dezactivarea sursei',
                                                            error: error.message
                                                        }));
                                                    }
                                                });
                                            });
                                        } catch (error) {
                                            console.error('Eroare middleware autentificare:', error);
                                            res.writeHead(500, { 'Content-Type': 'application/json' });
                                            res.end(JSON.stringify({
                                                success: false,
                                                message: 'Eroare internă server'
                                            }));
                                        }
                                    });
                                } else if (pathName.match(/^\/api\/news\/[a-zA-Z0-9]+\/process$/)) {
                                    securityHeaders(req, res, async () => {
                                        try {
                                            verifyToken(req, res, async () => {
                                                isAdmin(req, res, async () => {
                                                    try {
                                                        const id = pathName.split('/')[3];
                                                        const { relatedProducts = [] } = await parseRequestBody(req);

                                                        const updatedNews = await newsService.markNewsAsProcessed(id, relatedProducts);

                                                        if (!updatedNews) {
                                                            res.writeHead(404, { 'Content-Type': 'application/json' });
                                                            res.end(JSON.stringify({
                                                                success: false,
                                                                message: 'Știrea nu a fost găsită'
                                                            }));
                                                            return;
                                                        }

                                                        res.writeHead(200, { 'Content-Type': 'application/json' });
                                                        res.end(JSON.stringify({
                                                            success: true,
                                                            message: 'Știre marcată ca procesată',
                                                            news: updatedNews
                                                        }));
                                                    } catch (error) {
                                                        console.error('Eroare la marcarea știrii ca procesată:', error);
                                                        res.writeHead(500, { 'Content-Type': 'application/json' });
                                                        res.end(JSON.stringify({
                                                            success: false,
                                                            message: 'Eroare la marcarea știrii ca procesată',
                                                            error: error.message
                                                        }));
                                                    }
                                                });
                                            });
                                        } catch (error) {
                                            console.error('Eroare middleware autentificare:', error);
                                            res.writeHead(500, { 'Content-Type': 'application/json' });
                                            res.end(JSON.stringify({
                                                success: false,
                                                message: 'Eroare internă server'
                                            }));
                                        }
                                    });
                                }
                            } else if (method === 'DELETE') {
                                if (pathName.startsWith('/api/products/')) {
                                    securityHeaders(req, res, async () => {
                                        try {
                                            verifyToken(req, res, async () => {
                                                isAdmin(req, res, async () => {
                                                    try {
                                                        const id = pathName.split('/')[3];

                                                        const product = await Product.findByIdAndDelete(id);

                                                        if (!product) {
                                                            res.writeHead(404, { 'Content-Type': 'application/json' });
                                                            res.end(JSON.stringify({
                                                                success: false,
                                                                message: 'Produsul nu a fost găsit'
                                                            }));
                                                            return;
                                                        }

                                                        res.writeHead(200, { 'Content-Type': 'application/json' });
                                                        res.end(JSON.stringify({
                                                            success: true,
                                                            message: 'Produs șters cu succes'
                                                        }));
                                                    } catch (error) {
                                                        console.error('Eroare la ștergerea produsului:', error);
                                                        res.writeHead(500, { 'Content-Type': 'application/json' });
                                                        res.end(JSON.stringify({
                                                            success: false,
                                                            message: 'Eroare la ștergerea produsului',
                                                            error: error.message
                                                        }));
                                                    }
                                                });
                                            });
                                        } catch (error) {
                                            console.error('Eroare middleware autentificare:', error);
                                            res.writeHead(500, { 'Content-Type': 'application/json' });
                                            res.end(JSON.stringify({
                                                success: false,
                                                message: 'Eroare internă server'
                                            }));
                                        }
                                    });
                                }
                                else if (pathName.startsWith('/api/users/')) {
                                    securityHeaders(req, res, async () => {
                                        verifyToken(req, res, async () => {
                                            isAdmin(req, res, async () => {
                                                const userId = pathName.split('/').pop();

                                                try {
                                                    const deletedUser = await User.findByIdAndDelete(userId);

                                                    if (!deletedUser) {
                                                        res.writeHead(404, { 'Content-Type': 'application/json' });
                                                        res.end(JSON.stringify({
                                                            success: false,
                                                            message: 'Utilizatorul nu a fost găsit.'
                                                        }));
                                                        return;
                                                    }

                                                    res.writeHead(200, { 'Content-Type': 'application/json' });
                                                    res.end(JSON.stringify({
                                                        success: true,
                                                        message: 'Utilizator șters cu succes.',
                                                        userId: deletedUser._id
                                                    }));
                                                } catch (error) {
                                                    console.error('Eroare la ștergerea utilizatorului:', error);
                                                    res.writeHead(500, { 'Content-Type': 'application/json' });
                                                    res.end(JSON.stringify({
                                                        success: false,
                                                        message: 'Eroare internă server.'
                                                    }));
                                                }
                                            });
                                        });
                                    });
                                }
                                else if (pathName.startsWith('/api/news/')) {
                                    securityHeaders(req, res, async () => {
                                        verifyToken(req, res, async () => {
                                            isAdmin(req, res, async () => {
                                                try {
                                                    const newsId = pathName.split('/').pop();

                                                    const deleted = await News.findByIdAndDelete(newsId);

                                                    if (!deleted) {
                                                        res.writeHead(404, { 'Content-Type': 'application/json' });
                                                        res.end(JSON.stringify({
                                                            success: false,
                                                            message: 'Știrea nu a fost găsită.'
                                                        }));
                                                        return;
                                                    }

                                                    res.writeHead(200, { 'Content-Type': 'application/json' });
                                                    res.end(JSON.stringify({
                                                        success: true,
                                                        message: 'Știrea a fost ștearsă.'
                                                    }));
                                                } catch (error) {
                                                    console.error('Eroare la ștergerea știrii:', error);
                                                    res.writeHead(500, { 'Content-Type': 'application/json' });
                                                    res.end(JSON.stringify({
                                                        success: false,
                                                        message: 'Eroare internă la ștergerea știrii.'
                                                    }));
                                                }
                                            });
                                        });
                                    });
                                }
                                 else if (pathName.match(/^\/api\/sources\/[a-zA-Z0-9]+$/)) {
                                    securityHeaders(req, res, async () => {
                                        try {
                                            verifyToken(req, res, async () => {
                                                isAdmin(req, res, async () => {
                                                    try {
                                                        const id = pathName.split('/')[3];

                                                        const deletedSource = await sourceService.deleteSource(id);

                                                        if (!deletedSource) {
                                                            res.writeHead(404, { 'Content-Type': 'application/json' });
                                                            res.end(JSON.stringify({
                                                                success: false,
                                                                message: 'Sursa nu a fost găsită'
                                                            }));
                                                            return;
                                                        }

                                                        res.writeHead(200, { 'Content-Type': 'application/json' });
                                                        res.end(JSON.stringify({
                                                            success: true,
                                                            message: 'Sursă ștearsă cu succes'
                                                        }));
                                                    } catch (error) {
                                                        console.error('Eroare la ștergerea sursei:', error);
                                                        res.writeHead(500, { 'Content-Type': 'application/json' });
                                                                                                res.end(JSON.stringify({
                                                                                                    success: false,
                                                                                                    message: 'Eroare la ștergerea sursei',
                                                                                                    error: error.message
                                                                                                }));
                                                                                            }
                                                                                        });
                                                                                    });
                                                                                } catch (error) {
                                                                                    console.error('Eroare middleware autentificare:', error);
                                                                                    res.writeHead(500, { 'Content-Type': 'application/json' });
                                                                                    res.end(JSON.stringify({
                                                                                        success: false,
                                                                                        message: 'Eroare internă server'
                                                                                    }));
                                                                                }
                                                                            });
                                                                        }
                                                                    } else if (method === 'OPTIONS') {
                                                                        securityHeaders(req, res, () => {
                                                                            res.writeHead(204, {
                                                                                'Access-Control-Allow-Origin': '*',
                                                                                'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
                                                                                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                                                                                'Access-Control-Max-Age': '86400'
                                                                            });
                                                                            res.end();
                                                                        });
                                                                    } else {
                                                                        securityHeaders(req, res, () => {
                                                                            res.writeHead(405, { 'Content-Type': 'text/plain' });
                                                                            res.end('405 - Method Not Allowed');
                                                                        });
                                                                    }
                                                                } catch (error) {
                                                                    console.error('Eroare generală server:', error);
                                                                    securityHeaders(req, res, () => {
                                                                        res.writeHead(500, { 'Content-Type': 'text/plain' });
                                                                        res.end('500 - Internal Server Error');
                                                                    });
                                                                }
                                                            });
                                                        });

                                                        server.on('error', (err) => {
                                                            console.error('Eroare server:', err);
                                                        });

                                                        server.listen(config.PORT, () => {
                                                            console.log(`Serverul rulează la http://localhost:${config.PORT}`);

                                                        });

                                                        process.on('SIGINT', () => {
                                                            console.log('Închidere server...');
                                                            server.close(async () => {
                                                                console.log('Server oprit.');
                                                                try {
                                                                    await mongoose.connection.close(false);
                                                                    console.log('Conexiune MongoDB închisă.');
                                                                    process.exit(0);
                                                                } catch (err) {
                                                                    console.error('Eroare la închiderea conexiunii MongoDB:', err);
                                                                    process.exit(1);
                                                                }
                                                            });
                                                        });

