
const fetch = require('node-fetch');

async function fetchAmazonProducts() {
    const url = 'https://api.apify.com/v2/datasets/SHYHI2ky6RmzNniVX/items?clean=true&format=json';
    const response = await fetch(url);
    const products = await response.json();

    products.forEach(prod => {
        console.log(prod.title || prod.name);
    });

}

fetchAmazonProducts();
