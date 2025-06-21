const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connection.on('connected', () => {
    console.log('MongoDB: Conexiune stabilită');
});

mongoose.connection.on('error', (err) => {
    console.error('MongoDB: Eroare conexiune', err);
});

mongoose.connection.on('disconnected', () => {
    console.log('MongoDB: Conexiune închisă');
});

process.on('SIGINT', async () => {
    await mongoose.connection.close();
    console.log('MongoDB: Conexiune închisă prin SIGINT');
    process.exit(0);
});

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
        });

        console.log('Conexiune MongoDB realizată.');

        if (process.env.NODE_ENV === 'development') {
            mongoose.set('debug', true);
        }

    } catch (error) {
        console.error('Eroare conexiune MongoDB:', error.message);
        process.exit(1);
    }
};

module.exports = connectDB;