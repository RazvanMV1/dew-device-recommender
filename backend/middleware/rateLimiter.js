const config = require('../config/config');

const ipRequestCounts = new Map();
const ipBanList = new Set();

const rateLimiter = (req, res, next) => {
    const ip = req.connection.remoteAddress || req.headers['x-forwarded-for'];

    if (ipBanList.has(ip)) {
        res.writeHead(429, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({
            success: false,
            message: 'Prea multe cereri. Încercați mai târziu.'
        }));
    }

    if (!ipRequestCounts.has(ip)) {
        ipRequestCounts.set(ip, {
            count: 1,
            firstRequest: Date.now()
        });
    } else {
        const data = ipRequestCounts.get(ip);
        const currentTime = Date.now();

        if (currentTime - data.firstRequest > config.RATE_LIMIT_WINDOW_MS) {
            data.count = 1;
            data.firstRequest = currentTime;
        } else {
            data.count++;

            if (data.count > config.RATE_LIMIT_MAX_REQUESTS) {
                ipBanList.add(ip);

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
