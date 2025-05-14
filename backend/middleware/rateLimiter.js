const config = require('../config/config');

// Implementare simplă de rate limiting
const ipRequestCounts = new Map();
const ipBanList = new Set();

const rateLimiter = (req, res, next) => {
    const ip = req.connection.remoteAddress || req.headers['x-forwarded-for'];

    // Verifică dacă IP-ul este deja banat
    if (ipBanList.has(ip)) {
        res.writeHead(429, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({
            success: false,
            message: 'Prea multe cereri. Încercați mai târziu.'
        }));
    }

    // Inițializează counter pentru IP dacă nu există
    if (!ipRequestCounts.has(ip)) {
        ipRequestCounts.set(ip, {
            count: 1,
            firstRequest: Date.now()
        });
    } else {
        const data = ipRequestCounts.get(ip);
        const currentTime = Date.now();

        // Resetează counter-ul dacă a trecut fereastra de timp
        if (currentTime - data.firstRequest > config.RATE_LIMIT_WINDOW_MS) {
            data.count = 1;
            data.firstRequest = currentTime;
        } else {
            // Incrementează counter-ul
            data.count++;

            // Verifică dacă s-a atins limita
            if (data.count > config.RATE_LIMIT_MAX_REQUESTS) {
                ipBanList.add(ip);

                // Scoate din lista de ban după o oră
                setTimeout(() => {
                    ipBanList.delete(ip);
                }, 60 * 60 * 1000);

                res.writeHead(429, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({
                    success: false,
                    message: 'Prea multe cereri. Încercați mai târziu.'
                }));
            }
        }
    }

    next();
};

module.exports = { rateLimiter };
