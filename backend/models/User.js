const mongoose = require('mongoose');
const bcrypt = require('bcryptjs'); // 🔒 Pentru hash-uirea parolelor

const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['admin', 'member'], default: 'member' },
    createdAt: { type: Date, default: Date.now },
    lastLogin: { type: Date }
});

// 🔒 Pre-hook pentru hash-uirea parolelor înainte de salvare
UserSchema.pre('save', async function(next) {
    if (this.isModified('password')) {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
    }
    next();
});

// 🔒 Metodă pentru verificarea parolei
UserSchema.methods.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', UserSchema);
