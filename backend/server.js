// backend/server.js

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const mongoose = require('mongoose');
require('dotenv').config(); // 🔥 Încărcăm variabilele din .env

const connectDB = require('./db');
const Product = require('./models/Product'); // 🔥 Importăm modelul Product

connectDB();

const PORT = process.env.PORT || 3000;

// Functie pentru servire fisiere statice
function serveStaticFile(res, filePath, contentType, responseCode = 200) {
    fs.readFile(filePath, (err, data) => {
        if (err) {
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            res.end('500 - Eroare internă server');
        } else {
            res.writeHead(responseCode, { 'Content-Type': contentType });
            res.end(data);
        }
    });
}

// Creare server
const server = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const method = req.method;
    const pathName = parsedUrl.pathname;
    console.log(`${method} ${pathName}`);

    if (method === 'GET') {
        if (pathName === '/') {
            serveStaticFile(res, path.join(__dirname, '../frontend/index.html'), 'text/html');
        } else if (pathName === '/stats') {
            serveStaticFile(res, path.join(__dirname, '../frontend/stats.html'), 'text/html');
        } else if (pathName === '/admin') {
            serveStaticFile(res, path.join(__dirname, '../frontend/dashboard.html'), 'text/html');
        } else if (pathName === '/api/products') {
            // 🔥 Citim toate produsele
            Product.find({})
                .then(products => {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ products }));
                })
                .catch(error => {
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, message: 'Eroare la extragerea produselor', error: error.message }));
                });
        } else {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('404 - Not Found');
        }
    }
    else if (method === 'POST') {
        if (pathName === '/api/login') {
            // 🔥 Procesăm login-ul admin
            let body = '';
            req.on('data', chunk => { body += chunk; });
            req.on('end', () => {
                try {
                    const credentials = JSON.parse(body);
                    if (credentials.username === 'admin' && credentials.password === 'admin123') {
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ success: true, message: 'Autentificare reușită' }));
                    } else {
                        res.writeHead(401, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ success: false, message: 'Autentificare eșuată' }));
                    }
                } catch (err) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, message: 'Date invalide' }));
                }
            });
        }
        else if (pathName === '/api/products') {
            // 🔥 Creăm un produs nou
            let body = '';
            req.on('data', chunk => { body += chunk; });
            req.on('end', () => {
                try {
                    const newProduct = new Product(JSON.parse(body));
                    newProduct.save()
                        .then(product => {
                            res.writeHead(201, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ success: true, product }));
                        })
                        .catch(error => {
                            res.writeHead(400, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ success: false, message: 'Eroare salvare produs', error: error.message }));
                        });
                } catch (err) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, message: 'Date invalide' }));
                }
            });
        }
        else {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('404 - Not Found');
        }
    }
    else if (method === 'PUT' && pathName.startsWith('/api/products/')) {
        // 🔥 Update produs
        const id = pathName.split('/')[3];
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
            try {
                const updates = JSON.parse(body);
                Product.findByIdAndUpdate(id, updates, { new: true })
                    .then(product => {
                        if (product) {
                            res.writeHead(200, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ success: true, product }));
                        } else {
                            res.writeHead(404, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ success: false, message: 'Produsul nu a fost găsit' }));
                        }
                    })
                    .catch(error => {
                        res.writeHead(400, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ success: false, message: 'Eroare update', error: error.message }));
                    });
            } catch (err) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, message: 'Date invalide' }));
            }
        });
    }
    else if (method === 'DELETE' && pathName.startsWith('/api/products/')) {
        // 🔥 Ștergere produs
        const id = pathName.split('/')[3];
        Product.findByIdAndDelete(id)
            .then(product => {
                if (product) {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: true, message: 'Produs șters' }));
                } else {
                    res.writeHead(404, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, message: 'Produsul nu a fost găsit' }));
                }
            })
            .catch(error => {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, message: 'Eroare la ștergere', error: error.message }));
            });
    }
    else {
        res.writeHead(405, { 'Content-Type': 'text/plain' });
        res.end('405 - Method Not Allowed');
    }
});

// Pornim serverul
server.listen(PORT, () => {
    console.log(`Serverul rulează la http://localhost:${PORT}`);
});
