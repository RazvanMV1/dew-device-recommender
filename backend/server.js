// backend/server.js
const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = 3000;

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
    console.log(`${method} ${parsedUrl.pathname}`);

    if (method === 'GET') {
        if (parsedUrl.pathname === '/') {
            serveStaticFile(res, path.join(__dirname, '../frontend/index.html'), 'text/html');
        } else if (parsedUrl.pathname === '/stats') {
            serveStaticFile(res, path.join(__dirname, '../frontend/stats.html'), 'text/html');
        } else if (parsedUrl.pathname === '/admin') {
            serveStaticFile(res, path.join(__dirname, '../frontend/dashboard.html'), 'text/html');
        } else if (parsedUrl.pathname === '/api/products') {
            // 🚀 Returnăm lista de produse (hardcodate pentru început)
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                products: [
                    { name: "Telefon XYZ", price: 1000, brand: "Brand1" },
                    { name: "Tabletă ABC", price: 1500, brand: "Brand2" }
                ]
            }));
        } else {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('404 - Not Found');
        }
    }
    else if (method === 'POST') {
        if (parsedUrl.pathname === '/api/login') {
            // 🚀 Procesăm login-ul admin
            let body = '';
            req.on('data', chunk => {
                body += chunk;
            });
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
        } else {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('404 - Not Found');
        }
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
