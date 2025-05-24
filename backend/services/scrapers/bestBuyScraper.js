// fetch-bestbuy-products.js (sau fetch-amazon-products.js)
const fetch = require('node-fetch'); // npm install node-fetch@2

async function fetchAmazonProducts() {
    const url = 'https://api.apify.com/v2/datasets/SHYHI2ky6RmzNniVX/items?clean=true&format=json';
    const response = await fetch(url);
    const products = await response.json();

    // Exemplu: afișează titlul fiecărui produs
    products.forEach(prod => {
        console.log(prod.title || prod.name);
    });

    // Poți salva produsele în MongoDB sau fișier, după nevoie
}

fetchAmazonProducts();
