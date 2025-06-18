const mongoose = require('mongoose');

const SourceSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 100
    },
    type: {
        type: String,
        enum: ['rss', 'api', 'scraping', 'manual'],
        required: true
    },
    url: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        trim: true
    },
    updateFrequency: {
        type: Number,
        default: 60
    },
    lastUpdated: {
        type: Date
    },
    active: {
        type: Boolean,
        default: true
    },
    credentials: {
        username: String,
        apiKey: String
    },
    settings: {
        type: Map,
        of: mongoose.Schema.Types.Mixed
    },
    tags: [String],
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

SourceSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

SourceSchema.methods.shouldUpdate = function() {
    if (!this.lastUpdated) return true;

    const now = new Date();
    const lastUpdate = new Date(this.lastUpdated);
    const diffMinutes = Math.floor((now - lastUpdate) / (1000 * 60));

    return diffMinutes >= this.updateFrequency;
};

SourceSchema.index({ type: 1, active: 1 });
SourceSchema.index({ url: 1 }, { unique: true });
SourceSchema.index({ lastUpdated: 1 });

module.exports = mongoose.model('Source', SourceSchema);
