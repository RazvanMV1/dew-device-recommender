const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema({
    type: { type: String, required: true },
    icon: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    time: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Activity', activitySchema);
