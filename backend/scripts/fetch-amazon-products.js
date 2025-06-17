const mongoose = require('mongoose');
const { importAmazonProductsFromApify } = require('../services/scrapers/amazonScraper');

const mongoUri = 'mongodb+srv://dew-admin:parola123@cluster0.4wjx28g.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

const link = process.argv[2];
const category = process.argv[3];

if (!link || !category) {
    console.error("Format corect: node fetch-amazon-products.js <apifyLink> <categorie>");
    process.exit(1);
}

mongoose.connect(mongoUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(async () => {
    console.log("Conectat la MongoDB!");

    const count = await importAmazonProductsFromApify(link, category);
    console.log(`Gata! Am importat ${count} produse în categoria "${category}".`);

    mongoose.disconnect();
    process.exit(0);
}).catch(err => {
    console.error("Eroare conexiune MongoDB:", err.message);
    process.exit(1);
});
