// 🔒 Middleware pentru adăugarea header-elor de securitate
const securityHeaders = (req, res, next) => {
    // Protecție împotriva MIME sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');

    // Protecție împotriva XSS
    res.setHeader('X-XSS-Protection', '1; mode=block');

    // Controlul resurselor care pot fi încărcate (CSP)
    res.setHeader('Content-Security-Policy', "default-src 'self'; img-src 'self' https: data:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline';");

    // Prevenire click-jacking
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');

    // Forțează HTTPS
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');

    next();
};

module.exports = { securityHeaders };
