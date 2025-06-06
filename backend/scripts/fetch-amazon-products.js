const mongoose = require('mongoose');
const { importAmazonProductsFromApify } = require('../services/scrapers/amazonScraper');

const mongoUri = 'mongodb+srv://dew-admin:parola123@cluster0.4wjx28g.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

mongoose.connect(mongoUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(async () => {
    console.log("Conectat la MongoDB!");

    const count = await importAmazonProductsFromApify();
    console.log(`Gata! Am importat ${count} produse din Apify (Amazon).`);

    mongoose.disconnect();
    process.exit(0);
}).catch(err => {
    console.error("Eroare conexiune MongoDB:", err.message);
    process.exit(1);
});
