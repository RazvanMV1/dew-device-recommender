window.addEventListener("DOMContentLoaded", function () {
    const grid = document.getElementById("products-grid");
    const sortSelect = document.getElementById("sortSelect");
    const loader = document.getElementById("loader");
    const errorBox = document.getElementById("error");
    const pagination = document.getElementById("pagination");
    const searchInput = document.getElementById("search-input");
    const searchBtn = document.getElementById("search-btn");

    function truncate(text, maxLength = 80) {
        return text.length > maxLength ? text.slice(0, maxLength - 3) + "..." : text;
    }

    function createProductCard(prod) {
        const name = prod.name || prod.title || "Fără nume";
        const image = prod.imageUrl || prod.image || "https://via.placeholder.com/150?text=Fara+imagine";
        const brand = prod.brand || "";
        const price = prod.price ? `${prod.price.toFixed(2)} EUR` : "Preț indisponibil";
        return `
            <div class="product-card" data-id="${prod._id}">
                <img src="${image}" alt="${name}" class="product-img" />
                <div class="product-details">
                    <h3 style="overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;">${truncate(name, 80)}</h3>
                    <div class="brand">${brand}</div>
                    <div class="price">${price}</div>
                    <button class="details-btn" data-id="${prod._id}">Detalii</button>
                </div>
            </div>
        `;
    }

    function renderPagination(current, total) {
        pagination.innerHTML = "";
        const createButton = (label, page, isActive = false, disabled = false) => {
            const btn = document.createElement("button");
            btn.textContent = label;
            btn.className = "page-button";
            if (isActive) btn.classList.add("active");
            if (disabled) btn.disabled = true;
            btn.addEventListener("click", () => {
                if (!disabled && page) setPage(page);
            });
            return btn;
        };

        pagination.appendChild(createButton("«", 1, false, current === 1));
        pagination.appendChild(createButton("‹", current - 1, false, current === 1));
        const delta = 2;
        let range = [];
        for (let i = Math.max(2, current - delta); i <= Math.min(total - 1, current + delta); i++) {
            range.push(i);
        }
        if (current > delta + 2) {
            pagination.appendChild(createButton("1", 1));
            pagination.appendChild(createButton("...", null, false, true));
        } else {
            for (let i = 1; i < Math.max(2, current - delta); i++) {
                pagination.appendChild(createButton(i, i));
            }
        }
        for (let i of range) {
            pagination.appendChild(createButton(i, i, i === current));
        }
        if (current < total - delta - 1) {
            pagination.appendChild(createButton("...", null, false, true));
            pagination.appendChild(createButton(total, total));
        } else {
            for (let i = Math.min(total - 1, current + delta) + 1; i <= total; i++) {
                pagination.appendChild(createButton(i, i));
            }
        }
        pagination.appendChild(createButton("›", current + 1, false, current === total));
        pagination.appendChild(createButton("»", total, false, current === total));
    }

    function setPage(page) {
        const params = new URLSearchParams(window.location.search);
        params.set("page", page);
        window.location.search = params.toString();
    }

    async function loadProducts() {
        loader.style.display = "";
        errorBox.textContent = "";
        grid.innerHTML = "";
        highlightActiveCategory();
        const params = new URLSearchParams(window.location.search);
        let url = `/api/products?`;

        for (const [key, value] of params.entries()) {
            if (value) {
                url += `${encodeURIComponent(key)}=${encodeURIComponent(value)}&`;
            }
        }
        if (url.endsWith('&')) url = url.slice(0, -1);

        console.log("URL FETCH:", url);

        try {
            const res = await fetch(url);
            const data = await res.json();
            console.log("PRODUSE API:", data.products);

            const currentCategory = params.get("category") || "";
            document.querySelectorAll(".category-btn").forEach(btn => {
                if (btn.dataset.cat === currentCategory) {
                    btn.classList.add("active");
                } else {
                    btn.classList.remove("active");
                }
            });

            if (!data.products || !data.products.length) {
                errorBox.textContent = "Nu s-au găsit produse.";
                loader.style.display = "none";
                pagination.innerHTML = "";
                return;
            }
            grid.innerHTML = data.products.map(createProductCard).join("");
            renderPagination(data.page, data.totalPages);
        } catch (err) {
            errorBox.textContent = "Eroare la încărcarea produselor.";
        } finally {
            loader.style.display = "none";
        }
    }

    function openProductModal(productId) {
        const modal = document.getElementById('product-modal');
        const detailContainer = document.getElementById('product-detail-container');
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';

        detailContainer.innerHTML = `
            <div class="loading-spinner">
                <i class="fas fa-spinner fa-spin"></i>
                <p>Se încarcă detaliile...</p>
            </div>
        `;

        fetch(`/api/products/${productId}`)
            .then(res => res.json())
            .then(data => {
                if (data.success && data.product) {
                    const product = data.product;
                    const fallbackImage = 'https://via.placeholder.com/600x400?text=No+Image';
                    const images = Array.isArray(product.galleryThumbnails) && product.galleryThumbnails.length > 0
                        ? product.galleryThumbnails
                        : [product.image || fallbackImage];
                    const priceEUR = product.price ? product.price.toFixed(2) : "-";

                    const shown = product.features?.slice(0, 4) || [];
                    const hidden = product.features?.slice(4) || [];
                    const shownHTML = shown.map(f => `
                        <li class="feature-item">
                            <i class="fas fa-check-circle"></i>
                            <span>${f}</span>
                        </li>
                    `).join('');
                    const hiddenHTML = hidden.length > 0 ? `
                        <div id="feature-hidden" style="display: none;">
                            ${hidden.map(f => `
                                <li class="feature-item">
                                    <i class="fas fa-check-circle"></i>
                                    <span>${f}</span>
                                </li>
                            `).join('')}
                        </div>
                        <button id="toggle-features" class="toggle-btn">Afișează mai mult</button>
                    ` : '';

                    let descriptionSection = '';
                    if (product.description) {
                        const isLong = product.description.length > 340;
                        descriptionSection = `
                            <div class="product-detail-description${isLong ? ' description-short' : ''}" id="prod-desc">
                                ${product.description}
                            </div>
                            ${isLong ? '<button id="toggle-desc" class="toggle-btn">Afișează mai mult</button>' : ''}
                        `;
                    }

                    const productHTML = `
                        <div class="product-detail-content">
                            <div class="product-gallery">
                                <div class="product-main-image">
                                    <img src="${images[0]}" alt="${product.name}">
                                </div>
                                ${images.length > 1 ? `
                                <div class="product-thumbnails">
                                    ${images.map((img, i) => `
                                        <div class="product-thumbnail${i === 0 ? ' active' : ''}">
                                            <img src="${img}" alt="Thumbnail ${i + 1}">
                                        </div>
                                    `).join('')}
                                </div>` : ''}
                            </div>
                            <div class="product-details-info">
                                <div class="flex-header">
                                    <h2 class="product-detail-title" style="overflow:hidden;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;">
                                        ${product.name}
                                    </h2>
                                    <a href="${product.url}" target="_blank" class="btn-site-link">
                                        Vezi pe site <i class="fas fa-external-link-alt"></i>
                                    </a>
                                </div>
                                <div class="product-detail-price">
                                    <span class="detail-current-price">${priceEUR} EUR</span>
                                    <span class="detail-old-price">${(product.price * 1.2).toFixed(2)} EUR</span>
                                    <span class="detail-discount">-20%</span>
                                </div>
                                ${descriptionSection}
                            </div>
                        </div>
                        <div class="product-detail-features">
                            <h4>Caracteristici principale</h4>
                            <ul class="feature-list">
                                ${shownHTML}
                                ${hiddenHTML}
                            </ul>
                        </div>
                        <div class="product-comparable-models">
                            <h4>Produse similare</h4>
                            <div class="comparable-models-grid" id="comparable-models">
                                <p>Se încarcă recomandările...</p>
                            </div>
                        </div>
                    `;

                    detailContainer.innerHTML = productHTML;
                    initProductGallery();
                    loadSimilarProducts(product);

                    const toggleFeaturesBtn = document.getElementById('toggle-features');
                    const hiddenFeatures = document.getElementById('feature-hidden');
                    if (toggleFeaturesBtn && hiddenFeatures) {
                        toggleFeaturesBtn.addEventListener('click', () => {
                            const expanded = hiddenFeatures.style.display === 'block';
                            hiddenFeatures.style.display = expanded ? 'none' : 'block';
                            toggleFeaturesBtn.textContent = expanded ? 'Afișează mai mult' : 'Afișează mai puțin';
                        });
                    }

                    const toggleDescBtn = document.getElementById('toggle-desc');
                    const descBox = document.getElementById('prod-desc');
                    if (toggleDescBtn && descBox) {
                        toggleDescBtn.addEventListener('click', () => {
                            const expanded = descBox.classList.toggle('description-expanded');
                            descBox.classList.toggle('description-short', !expanded);
                            toggleDescBtn.textContent = expanded ? 'Afișează mai puțin' : 'Afișează mai mult';
                        });
                    }
                } else {
                    detailContainer.innerHTML = `<p>Nu s-au putut încărca detaliile produsului.</p>`;
                }
            });
    }

    function initProductGallery() {
        const thumbnails = document.querySelectorAll('.product-thumbnail');
        const mainImage = document.querySelector('.product-main-image img');
        thumbnails.forEach(thumbnail => {
            thumbnail.addEventListener('click', function () {
                thumbnails.forEach(t => t.classList.remove('active'));
                this.classList.add('active');
                const newImageSrc = this.querySelector('img').src;
                mainImage.src = newImageSrc;
            });
        });
    }

    function highlightActiveCategory() {
        const params = new URLSearchParams(window.location.search);
        const cat = params.get("category") || "";
        const brand = params.get("brand") || "";
        const price = params.get("price") || "";

        document.querySelectorAll(".category-btn").forEach(btn => btn.classList.remove("active"));

        const isPreferences =
            (cat && cat.includes(",")) || brand || price;

        if (isPreferences) {
            const prefBtn = document.querySelector(".btn-preferences");
            if (prefBtn) prefBtn.classList.add("active");
        } else if (cat) {
            document.querySelectorAll(".category-btn[data-cat]").forEach(btn => {
                if (btn.dataset.cat === cat) btn.classList.add("active");
            });
        }
    }


    function loadSimilarProducts(product) {
        const container = document.getElementById('comparable-models');
        container.innerHTML = '<p>Se încarcă recomandările...</p>';
        fetch(`/api/products/${product._id}/recommendations`)
            .then(res => res.json())
            .then(data => {
                if (data.success && data.recommendations.length > 0) {
                    container.innerHTML = '';
                    const truncate = (str, max = 60) =>
                        str.length > max ? str.slice(0, max - 3) + '...' : str;
                    data.recommendations.forEach(similar => {
                        const card = document.createElement('div');
                        card.className = 'comparable-model-card';
                        card.innerHTML = `
                            <div class="comparable-model-img">
                                <img src="${similar.image || 'https://via.placeholder.com/80'}" alt="${similar.name}">
                            </div>
                            <div class="comparable-model-name">${truncate(similar.name, 60)}</div>
                            <div class="comparable-model-price">${similar.price.toFixed(2)} EUR</div>
                        `;
                        card.addEventListener('click', () => {
                            openProductModal(similar._id);
                        });
                        container.appendChild(card);
                    });
                } else {
                    container.innerHTML = '<p>Nu s-au găsit produse similare.</p>';
                }
            })
            .catch(() => {
                container.innerHTML = '<p>Eroare la încărcarea produselor similare.</p>';
            });
    }

    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('details-btn')) {
            const id = e.target.dataset.id;
            if (id) openProductModal(id);
        }
    });

    document.addEventListener('click', (e) => {
        const modal = document.getElementById('product-modal');
        if (e.target.classList.contains('close-modal') || e.target === modal) {
            modal.classList.remove('active');
            document.body.style.overflow = '';
        }
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            document.getElementById('product-modal').classList.remove('active');
            document.body.style.overflow = '';
        }
    });

    document.querySelectorAll(".category-btn[data-cat]").forEach(btn => {
        btn.addEventListener("click", () => {
            const cat = btn.dataset.cat;
            if (cat) {
                window.location.href = `/products?category=${encodeURIComponent(cat)}`;
            } else {
                window.location.href = `/products`;
            }
        });
    });


    const preferencesBtn = document.querySelector('.category-nav .category-btn:not([data-cat])');
    if (preferencesBtn) {
        preferencesBtn.addEventListener('click', async function () {
            const token = localStorage.getItem('authToken');
            if (!token) {
                alert('Trebuie să fii autentificat pentru a folosi preferințele!');
                return;
            }
            try {
                const resp = await fetch('/api/profile/preferences', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = await resp.json();
                const prefs = data.preferences || {};

                let queryArr = [];
                if (prefs.categories && Array.isArray(prefs.categories)) {
                    const cats = prefs.categories.map(cat => cat && cat.trim()).filter(Boolean);
                    if (cats.length > 0) queryArr.push('category=' + encodeURIComponent(cats.join(',')));
                }
                if (prefs.brands && Array.isArray(prefs.brands)) {
                    const brs = prefs.brands.map(brand => brand && brand.trim()).filter(Boolean);
                    if (brs.length > 0) queryArr.push('brand=' + encodeURIComponent(brs.join(',')));
                }
                if (prefs.priceRange) {
                    let prices = Array.isArray(prefs.priceRange) ? prefs.priceRange : [prefs.priceRange];
                    prices = prices.map(p => p && p.trim().toLowerCase()).filter(Boolean);
                    if (prices.length > 0) queryArr.push('price=' + encodeURIComponent(prices.join(',')));
                }
                const finalQuery = queryArr.join('&');
                if (finalQuery.length === 0) {
                    alert("Nu ai preferințe setate!");
                    return;
                }
                window.location.href = '/products?' + finalQuery;
            } catch (err) {
                alert('Eroare la preluarea preferințelor!');
            }
        });
    }

    sortSelect.addEventListener("change", () => {
        const params = new URLSearchParams(window.location.search);
        const sortVal = sortSelect.value;
        if (sortVal) params.set("sort", sortVal);
        else params.delete("sort");
        params.delete("page");
        window.location.search = params.toString();
    });

    searchBtn.addEventListener("click", () => {
        const inputValue = searchInput.value.trim();
        const params = new URLSearchParams(window.location.search);
        if (inputValue) params.set("search", inputValue);
        else params.delete("search");
        params.delete("page");
        window.location.search = params.toString();
    });

    searchInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
            const inputValue = searchInput.value.trim();
            const params = new URLSearchParams(window.location.search);
            if (inputValue) params.set("search", inputValue);
            else params.delete("search");
            params.delete("page");
            window.location.search = params.toString();
        }
    });

    loadProducts();
});
