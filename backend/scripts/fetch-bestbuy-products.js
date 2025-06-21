const mongoose = require('mongoose');
const { importBestBuyProductsFromApify } = require('../services/scrapers/bestBuyScraper');
const dbConfig = require('../config/config');

mongoose.connect(dbConfig.mongoUri || 'mongodb+srv://dew-admin:parola123@cluster0.4wjx28g.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0', {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(async () => {
    console.log("Conectat la MongoDB!");

    const count = await importBestBuyProductsFromApify();
    console.log(`Gata! Am importat ${count} produse din Apify (BestBuy).`);

    mongoose.disconnect();
    process.exit(0);
}).catch(err => {
    console.error("Eroare conexiune MongoDB:", err.message);
    process.exit(1);
});
