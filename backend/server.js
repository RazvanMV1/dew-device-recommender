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
const { verifyToken, isAdmin } = require('./middleware/auth');
const { securityHeaders } = require('./middleware/security');
const { rateLimiter } = require('./middleware/rateLimiter');
const { validateProduct, sanitizeText } = require('./utils/validator');
const authService = require('./services/authService');
const sourceService = require('./services/sourceService');

// Conectare la baza de date MongoDB
connectDB();

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
createDefaultAdmin();

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
                } else if (pathName === '/admin') {
                    serveStaticFile(req, res, path.join(__dirname, '../frontend/dashboard.html'), 'text/html');
                }
                // ========== API ROUTES FOR PRODUCTS ==========
                else if (pathName === '/api/products') {
                    // Aplică headers de securitate
                    securityHeaders(req, res, async () => {
                        try {
                            // Parametri de filtrare și sortare opționali
                            const { category, brand, sort, limit = 20, page = 1 } = parsedUrl.query;

                            // Construiește filtre
                            const filter = {};
                            if (category) filter.category = category;
                            if (brand) filter.brand = brand;

                            // Opțiuni sortare și paginare
                            const options = {
                                limit: parseInt(limit),
                                skip: (parseInt(page) - 1) * parseInt(limit)
                            };

                            // Sortare
                            if (sort) {
                                const [field, order] = sort.split(':');
                                options.sort = { [field]: order === 'desc' ? -1 : 1 };
                            }

                            const products = await Product.find(filter, null, options);
                            const total = await Product.countDocuments(filter);

                            res.writeHead(200, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({
                                success: true,
                                total,
                                page: parseInt(page),
                                limit: parseInt(limit),
                                totalPages: Math.ceil(total / parseInt(limit)),
                                products
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
                } else if (pathName.startsWith('/api/products/') && pathName.split('/').length === 4) {
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
                                            console.log(`🧪 Rutele API disponibile pentru surse:
                                            - GET    /api/sources                    - Listează toate sursele
                                            - GET    /api/sources/:id                - Detalii sursă
                                            - GET    /api/sources/by-type/:type      - Surse după tip (rss/api/scraping/manual)
                                            - POST   /api/sources                    - Creează sursă nouă (necesită autentificare)
                                            - PUT    /api/sources/:id                - Actualizează sursă (necesită autentificare)
                                            - PATCH  /api/sources/:id/toggle-active  - Activează/dezactivează sursă (necesită autentificare)
                                            - DELETE /api/sources/:id                - Șterge sursă (necesită autentificare)
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