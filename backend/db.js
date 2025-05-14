// Îmbunătățire db.js cu monitorizare
const mongoose = require('mongoose');
require('dotenv').config();

// Monitorizare evenimente MongoDB
mongoose.connection.on('connected', () => {
    console.log('🟢 MongoDB: Conexiune stabilită');
});

mongoose.connection.on('error', (err) => {
    console.error('🔴 MongoDB: Eroare conexiune', err);
});

mongoose.connection.on('disconnected', () => {
    console.log('🟠 MongoDB: Conexiune închisă');
});

// Închide conexiunea la închiderea aplicației
process.on('SIGINT', async () => {
    await mongoose.connection.close();
    console.log('🔌 MongoDB: Conexiune închisă prin SIGINT');
    process.exit(0);
});

// Configurare opțiuni conexiune pentru performanță și robustețe
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI, {
            // Aceste opțiuni sunt pentru versiuni mai vechi de Mongoose
            // În versiunile noi sunt activate implicit
            useNewUrlParser: true,
            useUnifiedTopology: true,
            // Aceste opțiuni controlează retries și timeouts
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
        });

        console.log('✅ Conexiune MongoDB realizată.');

        // Debug mode pentru dezvoltare - vezi toate query-urile
        if (process.env.NODE_ENV === 'development') {
            mongoose.set('debug', true);
        }

    } catch (error) {
        console.error('❌ Eroare conexiune MongoDB:', error.message);
        process.exit(1);
    }
};

module.exports = connectDB;