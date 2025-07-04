const axios = require('axios');
const Product = require('../../models/Product');


async function importDummyJsonProducts(query = 'laptop') {
    const url = `https://dummyjson.com/products/search?q=${encodeURIComponent(query)}`;
    try {
        const { data } = await axios.get(url);
        const products = data.products;
        let importCount = 0;

        for (const prod of products) {
            const exists = await Product.findOne({ name: prod.title, price: prod.price });
            if (!exists) {
                const newProd = new Product({
                    name: prod.title,
                    price: prod.price,
                    link: `https://dummyjson.com/products/${prod.id}`,
                    img: prod.thumbnail,
                    description: prod.description,
                    category: prod.category,
                    brand: prod.brand
                });
                await newProd.save();
                importCount++;
                console.log(`Salvat: ${prod.title}`);
            }
        }
        return importCount;
    } catch (err) {
        console.error("Eroare DummyJSON:", err.message);
        return 0;
    }
}

module.exports = { importDummyJsonProducts };
