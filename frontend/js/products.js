// products.js
window.addEventListener("DOMContentLoaded", function () {
    const grid = document.getElementById("products-grid");

    // Loading state
    grid.innerHTML = "<p>Se încarcă produsele...</p>";

    fetch("/api/products")
        .then(res => res.json())
        .then(data => {
            if (!data.products || !data.products.length) {
                grid.innerHTML = "<p>Nu s-au găsit produse.</p>";
                return;
            }

            // Generează HTML pentru fiecare produs
            grid.innerHTML = data.products.map(prod => {
                // Nume: 'name' sau 'title'
                const name = prod.name || prod.title || "Fără nume";
                // Imagine: 'imageUrl' sau 'image'
                const image = prod.imageUrl || prod.image || 'https://via.placeholder.com/150?text=Fara+imagine';
                // Brand, dacă există
                const brand = prod.brand || "";
                // Preț
                const price = prod.price ? "€" + prod.price : "Preț indisponibil";
                // Link: 'productUrl' sau 'url'
                const detailsUrl = prod.productUrl || prod.url || "#";
                // Id pentru detalii
                const id = prod._id;

                return `
        <div class="product-card">
            <img src="${image}" alt="${name}" class="product-img" />
            <div class="product-details">
                <h3>${name}</h3>
                <div class="brand">${brand}</div>
                <div class="price">${price}</div>
                <a class="details-btn" href="/product.html?id=${id}">Detalii</a>
            </div>
        </div>
    `;
            }).join("");

        })
        .catch(err => {
            grid.innerHTML = "<p style='color:red;'>Eroare la încărcarea produselor.</p>";
        });
});
