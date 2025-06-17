window.addEventListener("DOMContentLoaded", function () {
    const grid = document.getElementById("products-grid");
    const sortSelect = document.getElementById("sortSelect");
    const loader = document.getElementById("loader");
    const errorBox = document.getElementById("error");
    const pagination = document.getElementById("pagination");
    const searchInput = document.getElementById("search-input");
    const searchBtn = document.getElementById("search-btn");

    const params = new URLSearchParams(window.location.search);
    let currentCategory = params.get("category") || "";
    let searchQuery = params.get("search") || "";
    let currentSort = "";
    let currentPage = 1;

    if (searchInput && searchQuery) searchInput.value = searchQuery;

    if (currentCategory) {
        document.querySelectorAll(".category-btn").forEach(btn => {
            if (btn.dataset.cat === currentCategory) {
                btn.classList.add("active");
            } else {
                btn.classList.remove("active");
            }
        });
    }

    function createProductCard(prod) {
        const name = prod.name || prod.title || "Fără nume";
        const image = prod.imageUrl || prod.image || "https://via.placeholder.com/150?text=Fara+imagine";
        const brand = prod.brand || "";
        const price = prod.price ? "€" + prod.price : "Preț indisponibil";
        const externalUrl = prod.url || prod.productUrl || "";

        const detailsButton = externalUrl
            ? `<a class="details-btn" href="${externalUrl}" target="_blank" rel="noopener noreferrer">Detalii</a>`
            : "";

        return `
        <div class="product-card">
            <img src="${image}" alt="${name}" class="product-img" />
            <div class="product-details">
                <h3>${name}</h3>
                <div class="brand">${brand}</div>
                <div class="price">${price}</div>
                ${detailsButton}
            </div>
        </div>`;
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
                if (!disabled && page) loadProducts(page);
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

    async function loadProducts(page = 1) {
        loader.style.display = "";
        errorBox.textContent = "";
        grid.innerHTML = "";
        currentPage = page;

        let url = `/api/products?limit=20&page=${page}`;
        if (currentCategory) url += `&category=${encodeURIComponent(currentCategory)}`;
        if (currentSort) url += `&sort=${encodeURIComponent(currentSort)}`;
        if (searchQuery) url += `&search=${encodeURIComponent(searchQuery)}`;

        try {
            const res = await fetch(url);
            const data = await res.json();

            if (!data.products || !data.products.length) {
                errorBox.textContent = "Nu s-au găsit produse.";
                loader.style.display = "none";
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

    document.querySelectorAll(".category-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            currentCategory = btn.dataset.cat;
            document.querySelectorAll(".category-btn").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            loadProducts(1);
        });
    });

    sortSelect.addEventListener("change", () => {
        currentSort = sortSelect.value;
        loadProducts(1);
    });

    searchBtn.addEventListener("click", () => {
        const inputValue = searchInput.value.trim();
        if (inputValue) {
            window.location.href = `/products?search=${encodeURIComponent(inputValue)}`;
        }
    });

    searchInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
            const inputValue = searchInput.value.trim();
            if (inputValue) {
                window.location.href = `/products?search=${encodeURIComponent(inputValue)}`;
            }
        }
    });

    loadProducts();
});
