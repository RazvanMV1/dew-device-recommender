// backend/server.js

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
const News = require('./models/News'); // Adaugă modelul News
const { verifyToken, isAdmin } = require('./middleware/auth');
const { securityHeaders } = require('./middleware/security');
const { rateLimiter } = require('./middleware/rateLimiter');
const { validateProduct, sanitizeText } = require('./utils/validator');
const authService = require('./services/authService');
const sourceService = require('./services/sourceService');
const rssService = require('./services/rssService'); // Adaugă serviciul RSS
const newsService = require('./services/newsService'); // Adaugă serviciul News
const schedulerService = require('./services/schedulerService'); // Adaugă serviciul Scheduler

// Conectare la baza de date MongoDB și inițializare job-uri
connectDB().then(() => {
    // Creează utilizatorul admin implicit
    createDefaultAdmin();

    // Inițializează job-urile programate pentru actualizarea RSS
    schedulerService.initScheduledJobs();
    console.log('📅 Job-uri programate pentru actualizare RSS inițializate');
}).catch(err => {
    console.error('❌ Eroare la conectarea la MongoDB:', err);
});

// Creează un utilizator admin implicit dacă nu există
async function createDefaultAdmin() {
    try {
        const adminCount = await User.countDocuments({ role: 'admin' });

        if (adminCount === 0) {
            await authService.registerUser({
                username: 'admin',
                password: 'admin123SecureP@ss',
                role: 'admin'
            });
            console.log('✅ Utilizator admin implicit creat');
        }
    } catch (error) {
        console.error('❌ Eroare la crearea utilizatorului admin implicit:', error);
    }
}

// Funcție pentru servire fisiere statice cu middleware de securitate
function serveStaticFile(req, res, filePath, contentType, responseCode = 200) {
    // Aplică headers de securitate pentru toate răspunsurile
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

// Funcție pentru parsarea body-ului cererilor
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

// Creare server
const server = http.createServer(async (req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const method = req.method;
    const pathName = parsedUrl.pathname;

    console.log(`${method} ${pathName}`);

    // Aplică rate limiting pentru toate cererile
    rateLimiter(req, res, async () => {
        try {
            // Rutare
            if (method === 'GET') {
                if (pathName === '/') {
                    serveStaticFile(req, res, path.join(__dirname, '../frontend/index.html'), 'text/html');
                } else if (pathName === '/stats') {
                    serveStaticFile(req, res, path.join(__dirname, '../frontend/stats.html'), 'text/html');
                } else if (pathName === '/profile') {
                    serveStaticFile(req, res, path.join(__dirname, '../frontend/profile.html'), 'text/html');
                } else if (pathName === '/admin') {
                    serveStaticFile(req, res, path.join(__dirname, '../frontend/dashboard.html'), 'text/html');
                } else if (pathName === '/products' || pathName === '/products.html') {
                    serveStaticFile(req, res, path.join(__dirname, '../frontend/products.html'), 'text/html');
                } else if (pathName === '/preferences' || pathName === '/preferences.html') {
                    serveStaticFile(req, res, path.join(__dirname, '../frontend/preferences.html'), 'text/html');
                } else if (pathName === '/news-management' || pathName === '/news-management.html') {
                    serveStaticFile(req, res, path.join(__dirname, '../frontend/news-management.html'), 'text/html');
                }
                // Rute pentru paginile de autentificare și înregistrare
                else if (pathName === '/login' || pathName === '/login.html') {
                    serveStaticFile(req, res, path.join(__dirname, '../frontend/login.html'), 'text/html');
                } else if (pathName === '/register' || pathName === '/register.html') {
                    serveStaticFile(req, res, path.join(__dirname, '../frontend/register-member.html'), 'text/html');
                } else if (pathName === '/register-admin' || pathName === '/register-admin.html') {
                    serveStaticFile(req, res, path.join(__dirname, '../frontend/register-admin.html'), 'text/html');
                }
                // Rută pentru verificarea existenței administratorilor
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
                else if (pathName === '/api/profile/preferences') {
                    securityHeaders(req, res, async () => {
                        verifyToken(req, res, async () => {
                            if (!req.user) {
                                res.writeHead(401, { 'Content-Type': 'application/json' });
                                res.end(JSON.stringify({ success: false, message: 'Neautentificat' }));
                                return;
                            }
                            const user = await User.findById(req.user.id);
                            res.writeHead(200, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ success: true, preferences: user.preferences || {} }));
                        });
                    });
                }
                else if (pathName === '/api/profile') {
                    console.log("=== INTRAT PE /api/profile ===");
                    securityHeaders(req, res, async () => {
                        verifyToken(req, res, async () => {
                            console.log("=== verifyToken CALLBACK ===");
                            if (!req.user) {
                                console.log("NU E USER LOGAT");
                                res.writeHead(401, { 'Content-Type': 'application/json' });
                                res.end(JSON.stringify({ success: false, message: 'Neautentificat' }));
                                return;
                            }
                            console.log("USER LOGAT:", req.user);
                            res.writeHead(200, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({
                                success: true,
                                user: {
                                    username: req.user.username,
                                    email: req.user.email,
                                    role: req.user.role,
                                    avatar: req.user.avatar || null,
                                    createdAt: req.user.createdAt ? new Date(req.user.createdAt).toISOString() : null,
                                    lastLogin: req.user.lastLogin ? new Date(req.user.lastLogin).toISOString() : null
                                }
                            }));
                        });
                    });
                }



                // ========== API ROUTES FOR PRODUCTS ==========
                else if (pathName === '/api/products') {
                    securityHeaders(req, res, async () => {
                        try {
                            // Construiește filtre pentru ambele colecții
                            const { category, brand, sort, limit = 20, page = 1 } = parsedUrl.query;
                            const filter = {};
                            if (category) filter.category = category;
                            if (brand) filter.brand = brand;

                            // Ia produsele din ambele colecții
                            const products1 = await mongoose.connection.db.collection('products').find(filter).toArray();
                            const products2 = await mongoose.connection.db.collection('amazonproducts').find(filter).toArray();
                            let products = [...products1, ...products2];

                            // Sortare (manual)
                            if (sort) {
                                const [field, order] = sort.split(':');
                                products = products.sort((a, b) => {
                                    if (!a[field] || !b[field]) return 0;
                                    if (order === 'desc') return b[field] > a[field] ? 1 : -1;
                                    return a[field] > b[field] ? 1 : -1;
                                });
                            }

                            // Total
                            const total = products.length;

                            // Aplică paginarea (manual)
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
                // ==================== STATISTICI PRODUSE ====================
                else if (pathName === '/api/products/stats') {
                    // Endpoint pentru statistici produse (public)
                    securityHeaders(req, res, async () => {
                        try {
                            // Top 5 produse după numărul de recenzii
                            const topProducts = await mongoose.connection.db.collection('products')
                                .find({})
                                .sort({ reviewsCount: -1 })
                                .limit(5)
                                .project({ name: 1, reviewsCount: 1, category: 1, brand: 1, _id: 0 })
                                .toArray();

                            // Distribuție pe categorii (agregare + normalizare)
                            const categoriesAgg = await mongoose.connection.db.collection('products').aggregate([
                                { $group: { _id: "$category", count: { $sum: 1 } } },
                                { $sort: { count: -1 } }
                            ]).toArray();

                            // Normalizare categorii
                            const categoryMap = {};
                            categoriesAgg.forEach(cat => {
                                if (!cat._id) return;
                                let norm = cat._id.trim().toLowerCase();

                                // Reguli de normalizare (adaugă aici ce ai nevoie)
                                if (["laptopuri", "laptop", "laptops"].includes(norm)) norm = "laptop";
                                if (["telefoane", "telefon", "phones"].includes(norm)) norm = "telefon";
                                if (["tablete", "tablet", "tablets"].includes(norm)) norm = "tabletă";
                                if (["smartwatch-uri", "smartwatch", "ceasuri"].includes(norm)) norm = "smartwatch";
                                if (["componente pc", "componentă pc", "pc components"].includes(norm)) norm = "componente pc";
                                if (["periferice", "periferic", "peripherals"].includes(norm)) norm = "periferice";
                                if (["audio", "sunet"].includes(norm)) norm = "audio";
                                if (["drone", "dronă"].includes(norm)) norm = "dronă";
                                if (["altele", "other", "diverse"].includes(norm)) norm = "altele";

                                // Transformă la format cu prima literă mare
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
                            // Transformă rezultatul în array pentru frontend
                            const categoriesNormalized = Object.values(categoryMap);

                            // Distribuție pe culori - doar cele relevante
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
                    // Extrage produsul după ID
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
                // ========== API ROUTES FOR SOURCES ==========
                else if (pathName === '/api/sources') {
                    // Listează toate sursele
                    securityHeaders(req, res, async () => {
                        try {
                            // Parametri de filtrare și paginare
                            const { type, active, sort, limit = 20, page = 1 } = parsedUrl.query;

                            // Construiește filtre
                            const filters = {};
                            if (type) filters.type = type;
                            if (active !== undefined) filters.active = active === 'true';

                            // Opțiuni
                            const options = {
                                limit: parseInt(limit),
                                page: parseInt(page)
                            };

                            // Sortare
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
                    // Obține detaliile unei surse
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
                    // Obține surse după tip
                    securityHeaders(req, res, async () => {
                        try {
                            const type = pathName.split('/')[4];

                            // Validare tip
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
                // ========== API ROUTES FOR NEWS & RSS ==========
                else if (pathName === '/api/news') {
                    // Obține lista de știri, cu filtrare și paginare
                    securityHeaders(req, res, async () => {
                        try {
                            // Parametri de filtrare și paginare
                            const {
                                source,
                                category,
                                search,
                                sort = 'publishDate:desc',
                                limit = 20,
                                page = 1
                            } = parsedUrl.query;

                            // Construiește filtre
                            const filters = {};
                            if (source) filters.source = source;
                            if (category) filters.categories = category;

                            // Opțiuni
                            const options = {
                                limit: parseInt(limit),
                                page: parseInt(page)
                            };

                            // Sortare
                            if (sort) {
                                const [field, order] = sort.split(':');
                                options.sort = { [field]: order === 'desc' ? -1 : 1 };
                            }

                            let news;
                            let totalNews;

                            // Dacă există termen de căutare, folosește căutarea specială
                            if (search) {
                                news = await newsService.searchNews(search, options);
                                // Pentru simplitate, nu calculăm numărul total pentru căutări
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
                    // Obține detalii știre
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
                    // Obține cele mai recente știri
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
                    // Obține știri după sursă
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
                    // Obține știri după categorie
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
                    // Aplică headers de securitate
                    securityHeaders(req, res, async () => {
                        try {
                            const categories = await News.distinct('categories');

                            res.writeHead(200, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({
                                success: true,
                                categories: categories.filter(cat => cat) // Filtrăm valorile null/undefined
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
                    // Aplică headers de securitate
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
                    // Aplică headers de securitate și autentificare
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
                    // Aplică headers de securitate și autentificare
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
                    // Aplică headers de securitate și autentificare
                    securityHeaders(req, res, async () => {
                        verifyToken(req, res, async () => {
                            isAdmin(req, res, async () => {
                                try {
                                    // Returnează starea job-urilor
                                    res.writeHead(200, { 'Content-Type': 'application/json' });
                                    res.end(JSON.stringify({
                                        success: true,
                                        message: 'Job-uri programate pentru RSS',
                                        jobs: [
                                            {
                                                name: 'rssFeedUpdate',
                                                description: 'Verifică sursele RSS pentru actualizare',
                                                schedule: '*/10 * * * *' // Cron expression: la fiecare 10 minute
                                            },
                                            {
                                                name: 'cleanOldNews',
                                                description: 'Curăță știrile vechi neprocesate',
                                                schedule: '0 3 * * *' // Cron expression: la 3 AM în fiecare zi
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
                    // Generează feed RSS cu produse recomandate
                    securityHeaders(req, res, async () => {
                        try {
                            const { limit = 20, category } = parsedUrl.query;

                            const filter = {};
                            if (category) filter.category = category;

                            // Obține cele mai recente produse
                            const products = await Product.find(filter)
                                .sort({ createdAt: -1 })
                                .limit(parseInt(limit));

                            // Generează feed-ul
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
                    // Generează feed RSS cu ultimele știri
                    securityHeaders(req, res, async () => {
                        try {
                            const { limit = 20, category, source } = parsedUrl.query;

                            const filter = {};
                            if (category) filter.categories = category;
                            if (source) filter.source = source;

                            // Obține cele mai recente știri
                            const news = await News.find(filter)
                                .sort({ publishDate: -1 })
                                .limit(parseInt(limit));

                            // Generează feed-ul
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
                // Fișiere statice
                                else if (pathName.match(/\.(css|js|png|jpg|jpeg|gif|svg)$/)) {
                                    // Servire fișiere statice (CSS, JS, imagini)
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
                                    // Aplică headers de securitate
                                    securityHeaders(req, res, async () => {
                                        try {
                                            const credentials = await parseRequestBody(req);

                                            // Validare date de intrare
                                            if (!credentials.username || !credentials.password) {
                                                res.writeHead(400, { 'Content-Type': 'application/json' });
                                                res.end(JSON.stringify({
                                                    success: false,
                                                    message: 'Username și parolă necesare'
                                                }));
                                                return;
                                            }

                                            // Autentificare prin serviciul de autentificare
                                            const result = await authService.authenticate(
                                                sanitizeText(credentials.username),
                                                credentials.password
                                            );

                                            if (result.success) {
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
                                                // Găsește userul în DB
                                                const user = await User.findById(req.user.id);
                                                if (!user) {
                                                    res.writeHead(404, { 'Content-Type': 'application/json' });
                                                    res.end(JSON.stringify({ success: false, message: 'Utilizator inexistent.' }));
                                                    return;
                                                }
                                                // Verifică parola veche
                                                const valid = await user.comparePassword(currentPassword);
                                                if (!valid) {
                                                    res.writeHead(400, { 'Content-Type': 'application/json' });
                                                    res.end(JSON.stringify({ success: false, message: 'Parola veche este greșită.' }));
                                                    return;
                                                }
                                                // Setează parola nouă și salvează
                                                user.password = newPassword;
                                                await user.save();
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
                                    // Înregistrare publică (membri și primul admin)
                                    securityHeaders(req, res, async () => {
                                        try {
                                            const userData = await parseRequestBody(req);

                                            // Validare date
                                            if (!userData.username || !userData.password) {
                                                res.writeHead(400, { 'Content-Type': 'application/json' });
                                                res.end(JSON.stringify({
                                                    success: false,
                                                    message: 'Username și parolă necesare'
                                                }));
                                                return;
                                            }

                                            // Pentru înregistrare admin, verifică dacă există deja administratori
                                            if (userData.role === 'admin') {
                                                const adminCount = await User.countDocuments({ role: 'admin' });

                                                // Doar dacă nu există administratori, permite înregistrarea
                                                if (adminCount > 0) {
                                                    res.writeHead(403, { 'Content-Type': 'application/json' });
                                                    res.end(JSON.stringify({
                                                        success: false,
                                                        message: 'Înregistrarea administratorilor este restricționată. Contactați un administrator existent.'
                                                    }));
                                                    return;
                                                }
                                            }

                                            // Înregistrare utilizator nou
                                            const result = await authService.registerUser({
                                                username: sanitizeText(userData.username),
                                                password: userData.password,
                                                email: userData.email ? sanitizeText(userData.email) : undefined,
                                                role: userData.role === 'admin' ? 'admin' : 'member'
                                            });

                                            if (result.success) {
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
                                    // Rută protejată pentru crearea utilizatorilor noi (admin only)
                                    securityHeaders(req, res, async () => {
                                        try {
                                            // Verifică autentificarea și rolul
                                            verifyToken(req, res, async () => {
                                                isAdmin(req, res, async () => {
                                                    try {
                                                        const userData = await parseRequestBody(req);

                                                        // Validare date
                                                        if (!userData.username || !userData.password) {
                                                            res.writeHead(400, { 'Content-Type': 'application/json' });
                                                            res.end(JSON.stringify({
                                                                success: false,
                                                                message: 'Username și parolă necesare'
                                                            }));
                                                            return;
                                                        }

                                                        // Înregistrare utilizator nou
                                                        const result = await authService.registerUser({
                                                            username: sanitizeText(userData.username),
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
                                    // Rută protejată pentru crearea produselor noi
                                    securityHeaders(req, res, async () => {
                                        try {
                                            // Verifică autentificarea și rolul
                                            verifyToken(req, res, async () => {
                                                isAdmin(req, res, async () => {
                                                    try {
                                                        const productData = await parseRequestBody(req);

                                                        // Validare și sanitizare date
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

                                                        // Sanitizare câmpuri text
                                                        const sanitizedProduct = {
                                                            ...productData,
                                                            name: sanitizeText(productData.name),
                                                            brand: sanitizeText(productData.brand),
                                                            model: sanitizeText(productData.model),
                                                            color: sanitizeText(productData.color),
                                                            category: sanitizeText(productData.category),
                                                            features: productData.features?.map(feature => sanitizeText(feature))
                                                        };

                                                        // Creează produsul nou
                                                        const newProduct = new Product(sanitizedProduct);
                                                        const savedProduct = await newProduct.save();

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
                                    // Creează o sursă nouă (necesită autentificare)
                                    securityHeaders(req, res, async () => {
                                        try {
                                            verifyToken(req, res, async () => {
                                                isAdmin(req, res, async () => {
                                                    try {
                                                        const sourceData = await parseRequestBody(req);

                                                        // Validare date de bază
                                                        if (!sourceData.name || !sourceData.type || !sourceData.url) {
                                                            res.writeHead(400, { 'Content-Type': 'application/json' });
                                                            res.end(JSON.stringify({
                                                                success: false,
                                                                message: 'Câmpurile name, type și url sunt obligatorii'
                                                            }));
                                                            return;
                                                        }

                                                        const newSource = await sourceService.createSource(sourceData);

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
                                    // Procesează manual feed-uri RSS (pentru admin)
                                    securityHeaders(req, res, async () => {
                                        try {
                                            verifyToken(req, res, async () => {
                                                isAdmin(req, res, async () => {
                                                    try {
                                                        const body = await parseRequestBody(req);
                                                        let results;

                                                        if (body && body.sourceId) {
                                                            // Procesează doar un anumit feed
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
                                                            // Procesează toate feed-urile
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
                                    // Configurare job-uri programate pentru RSS
                                    securityHeaders(req, res, async () => {
                                        verifyToken(req, res, async () => {
                                            isAdmin(req, res, async () => {
                                                try {
                                                    // Actualizează configurația job-urilor
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
                                    // Rută protejată pentru actualizarea produselor
                                    securityHeaders(req, res, async () => {
                                        try {
                                            // Verifică autentificarea și rolul
                                            verifyToken(req, res, async () => {
                                                isAdmin(req, res, async () => {
                                                    try {
                                                        const id = pathName.split('/')[3];
                                                        const updates = await parseRequestBody(req);

                                                        // Validare și sanitizare date
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

                                                        // Sanitizare câmpuri text
                                                        const sanitizedUpdates = {
                                                            ...updates,
                                                            name: updates.name ? sanitizeText(updates.name) : undefined,
                                                            brand: updates.brand ? sanitizeText(updates.brand) : undefined,
                                                            model: updates.model ? sanitizeText(updates.model) : undefined,
                                                            color: updates.color ? sanitizeText(updates.color) : undefined,
                                                            category: updates.category ? sanitizeText(updates.category) : undefined,
                                                            features: updates.features?.map(feature => sanitizeText(feature))
                                                        };

                                                        // Actualizează produsul
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
                                    // Actualizează o sursă (necesită autentificare)
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
                                    // Activează/dezactivează o sursă (necesită autentificare)
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
                                    // Marchează o știre ca procesată (pentru admin)
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
                                    // Rută protejată pentru ștergerea produselor
                                    securityHeaders(req, res, async () => {
                                        try {
                                            // Verifică autentificarea și rolul
                                            verifyToken(req, res, async () => {
                                                isAdmin(req, res, async () => {
                                                    try {
                                                        const id = pathName.split('/')[3];

                                                        // Șterge produsul
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
                                } else if (pathName.match(/^\/api\/sources\/[a-zA-Z0-9]+$/)) {
                                    // Șterge o sursă (necesită autentificare)
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
                                                                        // Tratează pre-flight CORS requests
                                                                        securityHeaders(req, res, () => {
                                                                            res.writeHead(204, {
                                                                                'Access-Control-Allow-Origin': '*',
                                                                                'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
                                                                                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                                                                                'Access-Control-Max-Age': '86400' // 24 ore
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

                                                        // Handler pentru erori neașteptate la nivel de server
                                                        server.on('error', (err) => {
                                                            console.error('Eroare server:', err);
                                                        });

                                                        // Pornim serverul
                                                        server.listen(config.PORT, () => {
                                                            console.log(`📡 Serverul rulează la http://localhost:${config.PORT}`);
                                                            console.log(`🧪 Rutele API disponibile pentru surse și știri:
                                                            // Surse
                                                            - GET    /api/sources                    - Listează toate sursele
                                                            - GET    /api/sources/:id                - Detalii sursă
                                                            - GET    /api/sources/by-type/:type      - Surse după tip (rss/api/scraping/manual)
                                                            - POST   /api/sources                    - Creează sursă nouă (necesită autentificare)
                                                            - PUT    /api/sources/:id                - Actualizează sursă (necesită autentificare)
                                                            - PATCH  /api/sources/:id/toggle-active  - Activează/dezactivează sursă (necesită autentificare)
                                                            - DELETE /api/sources/:id                - Șterge sursă (necesită autentificare)

                                                            // Știri și RSS
                                                            - GET    /api/news                       - Listează toate știrile, cu filtrare și paginare
                                                            - GET    /api/news/categories            - Obține toate categoriile de știri
                                                            - GET    /api/news/stats                 - Obține statistici despre știri
                                                            - GET    /api/news/distribution          - Obține raport despre distribuția știrilor pe surse
                                                            - GET    /api/news/:id                   - Detalii știre
                                                            - GET    /api/news/latest/:limit         - Cele mai recente știri
                                                            - GET    /api/news/by-source/:sourceId   - Știri după sursă
                                                            - GET    /api/news/by-category/:category - Știri după categorie
                                                            - GET    /api/feed/products              - Feed RSS cu produse
                                                            - GET    /api/feed/news                  - Feed RSS cu știri
                                                            - POST   /api/rss/process                - Procesează manual feed-uri RSS (necesită autentificare)
                                                            - POST   /api/rss/schedule               - Configurare job-uri programate pentru RSS
                                                            - GET    /api/rss/stats                  - Obține statistici despre sursele RSS
                                                            - GET    /api/rss/schedule               - Obține starea job-urilor programate pentru RSS
                                                            - PATCH  /api/news/:id/process           - Marchează știre ca procesată (necesită autentificare)

                                                            // Autentificare
                                                            - GET    /login                          - Pagina de autentificare
                                                            - GET    /register                       - Pagina de înregistrare membri
                                                            - GET    /register-admin                 - Pagina de înregistrare administratori
                                                            - POST   /api/login                      - Endpoint autentificare
                                                            - POST   /api/register                   - Endpoint înregistrare (membri sau primul admin)
                                                            - POST   /api/admin/users                - Endpoint creare utilizatori (necesită autentificare admin)
                                                            - GET    /api/check-admin-exists         - Verifică existența administratorilor

                                                            // Pagini administrative pentru RSS
                                                            - GET    /news-management                - Pagina de management a știrilor
                                                            `);
                                                        });

                                                        // Gestionare închidere gracioasă
                                                        process.on('SIGINT', () => {
                                                            console.log('Închidere server...');
                                                            server.close(() => {
                                                                console.log('Server oprit.');
                                                                mongoose.connection.close(false, () => {
                                                                    console.log('Conexiune MongoDB închisă.');
                                                                    process.exit(0);
                                                                });
                                                            });
                                                        });