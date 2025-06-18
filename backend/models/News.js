
const mongoose = require('mongoose');

const NewsSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        required: true
    },
    content: {
        type: String
    },
    url: {
        type: String,
        required: true,
        unique: true
    },
    imageUrl: {
        type: String
    },
    publishDate: {
        type: Date,
        required: true
    },
    source: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Source',
        required: true
    },
    sourceName: {
        type: String,
        required: true
    },
    categories: {
        type: [String]
    },
    author: {
        type: String
    },
    isProcessed: {
        type: Boolean,
        default: false
    },
    relatedProducts: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product'
    }],
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

NewsSchema.index({ publishDate: -1 });
NewsSchema.index({ source: 1 });
NewsSchema.index({ url: 1 }, { unique: true });
NewsSchema.index({ categories: 1 });
NewsSchema.index({ 'relatedProducts': 1 });

NewsSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

module.exports = mongoose.model('News', NewsSchema);
