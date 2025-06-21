require('dotenv').config();

module.exports = {
    JWT_SECRET: process.env.JWT_SECRET || 'super_secret_key_change_in_production',
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '24h',
    PORT: process.env.PORT || 3000,
    MONGODB_URI: process.env.MONGODB_URI,
    RATE_LIMIT_WINDOW_MS: 15 * 60 * 1000,
    RATE_LIMIT_MAX_REQUESTS: 1000,
};
