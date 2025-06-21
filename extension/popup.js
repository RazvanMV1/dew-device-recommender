const API_BASE = "http://localhost:3004/api/products";

async function fetchProducts(category) {
    let url = API_BASE;
    if (category) url += `?category=${encodeURIComponent(category)}`;
    document.getElementById('products-list').innerHTML = 'Se încarcă...';
    const res = await fetch(url);
    const data = await res.json();
    if (!data.products || !data.products.length) {
        document.getElementById('products-list').innerHTML = 'Nu există produse.';
        return;
    }
    document.getElementById('products-list').innerHTML = data.products.map(prod => `
    <div class="product-item">
      <img src="${prod.imageUrl || prod.image || ''}" alt="" />
      <div class="product-title">${prod.name || prod.title}</div>
      <div class="product-price">${prod.price ? prod.price + " EUR" : ''}</div>
    </div>
  `).join('');
}

document.getElementById('category-select').addEventListener('change', function() {
    fetchProducts(this.value);
});

fetchProducts('');
