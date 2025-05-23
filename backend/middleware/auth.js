const jwt = require('jsonwebtoken');
const config = require('../config/config');
const User = require('../models/User');

// 🔒 Middleware pentru verificarea token-urilor JWT
const verifyToken = async (req, res, next) => {
    try {
        // Extragere token din header
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        if (!token) {
            return res.writeHead(401, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({
                success: false,
                message: 'Acces interzis. Token lipsă.'
            }));
        }

        // Verificare token
        const decoded = jwt.verify(token, config.JWT_SECRET);

        // Verificare existență user și roluri
        const user = await User.findById(decoded.id);
        if (!user) {
            return res.writeHead(401, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({
                success: false,
                message: 'Token invalid. Utilizator inexistent.'
            }));
        }

        // Adaugă informații user la request
        req.user = {
            id: user._id,
            username: user.username,
            role: user.role
        };

        next();
    } catch (error) {
        console.error('Eroare verificare token:', error);
        res.writeHead(401, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({
            success: false,
            message: 'Token invalid sau expirat.'
        }));
    }
};

// 🔒 Middleware pentru verificarea rolurilor
const isAdmin = (req, res, next) => {
    if (!req.user || req.user.role !== 'admin') {
        res.writeHead(403, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({
            success: false,
            message: 'Acces interzis. Permisiuni insuficiente.'
        }));
    }
    next();
};

module.exports = { verifyToken, isAdmin };
