const mongoose = require('mongoose');
require('dotenv').config(); // 🔥 Încărcăm variabilele din .env

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI); // 🔥 Luăm URL-ul corect din .env
        console.log('✅ Conexiune MongoDB realizată.');
    } catch (error) {
        console.error('❌ Eroare conexiune MongoDB:', error.message);
        process.exit(1); // Termină serverul dacă nu poate conecta
    }
};

module.exports = connectDB;
