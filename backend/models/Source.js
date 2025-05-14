const mongoose = require('mongoose');

const SourceSchema = new mongoose.Schema({
    name: { type: String, required: true },
    type: { type: String, enum: ['rss', 'api', 'scraping'], required: true },
    url: { type: String, required: true },
    active: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Source', SourceSchema);
