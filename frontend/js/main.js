document.addEventListener('DOMContentLoaded', function() {
initUI();
    loadProducts();
    loadNews();

    const filterBtns = document.querySelectorAll('.filter-btn');

    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const selectedCategory = btn.dataset.filter || 'all';
            loadProducts(selectedCategory);
        });
    });
    document.getElementById('load-more').addEventListener('click', function() {
        loadMoreProducts();
    });
    initScrollToTop();
});

function initUI() {
    if (typeof checkAuthStatus === 'function') checkAuthStatus();

    const userMenuTrigger = document.getElementById('user-menu-trigger');
    const userMenu = document.getElementById('user-menu');
    if (userMenuTrigger && userMenu) {
        userMenuTrigger.onclick = null;
        userMenuTrigger.addEventListener('click', function(e) {
            e.stopPropagation();
            userMenu.classList.toggle('active');
        });

        document.addEventListener('click', function(event) {
            if (!userMenu.contains(event.target) && !userMenuTrigger.contains(event.target)) {
                userMenu.classList.remove('active');
            }
        }, { once: true });
    }

    const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
    const mainNav = document.querySelector('.main-nav');
    if (mobileMenuToggle && mainNav) {
        mobileMenuToggle.onclick = null;
        mobileMenuToggle.addEventListener('click', function() {
            this.classList.toggle('active');
            mainNav.classList.toggle('active');
        });
    }

    if (typeof initProductModal === 'function') initProductModal();

    const logoutLink = document.getElementById('logout-link');
    if (logoutLink) {
        logoutLink.onclick = null;
        logoutLink.addEventListener('click', function(e) {
            e.preventDefault();
            if (typeof logout === 'function') logout();
        });
    }
}


function checkAuthStatus() {
    const authToken = localStorage.getItem('authToken');

    if (authToken) {
        try {
            const userData = JSON.parse(localStorage.getItem('userData') || '{}');

            document.getElementById('dropdown-user-name').textContent = userData.username || 'Utilizator';
            document.getElementById('dropdown-user-role').textContent = userData.role === 'admin' ? 'Administrator' : 'Membru';

            document.getElementById('profile-link').style.display = 'flex';
            document.getElementById('preferences-link').style.display = 'flex';
            document.getElementById('logout-link').style.display = 'flex';

            document.getElementById('auth-link').style.display = 'none';
            document.getElementById('register-link').style.display = 'none';

            const userNameElement = document.querySelector('.user-name');
            userNameElement.textContent = userData.username || 'Contul meu';

            if (userData.role === 'admin') {
                const adminLinkHTML = `
                    <a href="/admin" class="dropdown-item">
                        <i class="fas fa-tachometer-alt"></i>
                        <span>Dashboard Admin</span>
                    </a>
                `;

                document.querySelector('.dropdown-menu-body').insertAdjacentHTML('afterbegin', adminLinkHTML);
            }
        } catch (error) {
            console.error('Eroare la verificarea statusului de autentificare:', error);
        }
    }
}

function initScrollToTop() {
    const scrollTopButton = document.getElementById('scroll-top');

    window.addEventListener('scroll', function() {
        if (window.pageYOffset > 300) {
            scrollTopButton.classList.add('active');
        } else {
            scrollTopButton.classList.remove('active');
        }
    });

    scrollTopButton.addEventListener('click', function() {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });
}

function initProductModal() {
    const productModal = document.getElementById('product-modal');
    const closeModalBtn = productModal.querySelector('.close-modal');

    closeModalBtn.addEventListener('click', function() {
        closeProductModal();
    });

    productModal.addEventListener('click', function(e) {
        if (e.target === productModal) {
            closeProductModal();
        }
    });

    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && productModal.classList.contains('active')) {
            closeProductModal();
        }
    });
}

function openProductModal(productId) {
    const productModal = document.getElementById('product-modal');
    const productDetailContainer = document.getElementById('product-detail-container');

    productDetailContainer.innerHTML = `
        <div class="loading-spinner">
            <i class="fas fa-spinner fa-spin"></i>
            <p>Se încarcă detaliile...</p>
        </div>
    `;

    productModal.classList.add('active');
    document.body.style.overflow = 'hidden';

    fetch(`/api/products/${productId}`)
        .then(response => response.json())
        .then(data => {
            if (data.success && data.product) {
                const product = data.product;
                const fallbackImage = 'https://via.placeholder.com/600x400?text=No+Image';
                const hasMultipleImages = Array.isArray(product.galleryThumbnails) && product.galleryThumbnails.length > 1;
                const priceEUR = product.price.toFixed(2);

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

                const productHTML = `
                    <div class="product-detail-content">
                        <div class="product-gallery">
                            <div class="product-main-image">
                                <img src="${product.image}" alt="${product.name}">
                            </div>

                            ${hasMultipleImages ? `
                            <div class="product-thumbnails">
                                ${product.galleryThumbnails.map((img, i) => `
                                    <div class="product-thumbnail ${i === 0 ? 'active' : ''}">
                                        <img src="${img}" alt="Thumbnail ${i + 1}">
                                    </div>
                                `).join('')}
                            </div>` : ''}
                        </div>

                        <div class="product-details-info">
                            <div class="flex-header">
                                <h2 class="product-detail-title">${product.name}</h2>
                                <a href="${product.url}" target="_blank" class="btn-primary btn-site-link">
                                    Vezi pe site <i class="fas fa-external-link-alt"></i>
                                </a>
                            </div>

                            <div class="product-detail-price">
                                <span class="detail-current-price">${priceEUR} EUR</span>
                                <span class="detail-old-price">${(product.price * 1.2).toFixed(2)} EUR</span>
                                <span class="detail-discount">-20%</span>
                            </div>
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
                        <h4>Modele similare</h4>
                        <div class="comparable-models-grid" id="comparable-models">
                            <p>Se încarcă recomandările...</p>
                        </div>
                    </div>
                `;

                productDetailContainer.innerHTML = productHTML;
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

            } else {
                productDetailContainer.innerHTML = `
                    <div class="error-message">
                        <i class="fas fa-exclamation-circle"></i>
                        <h3>Eroare la încărcarea detaliilor</h3>
                        <p>${data.message || 'Nu s-au putut încărca detaliile produsului.'}</p>
                    </div>
                `;
            }
        })
        .catch(error => {
            console.error('Eroare la încărcarea detaliilor produsului:', error);
            productDetailContainer.innerHTML = `
                <div class="error-message">
                    <i class="fas fa-exclamation-circle"></i>
                    <h3>Eroare la încărcarea detaliilor</h3>
                    <p>A apărut o eroare în comunicarea cu serverul. Te rugăm să încerci din nou.</p>
                </div>
            `;
        });
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

                data.recommendations
                    .slice(0, 10)
                    .forEach(similar => {
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
                container.innerHTML = '<p>Nu s-au găsit modele similare.</p>';
            }
        })
        .catch(err => {
            console.error('Eroare la recomandări:', err);
            container.innerHTML = '<p>Eroare la încărcarea modelelor similare.</p>';
        });
}


function closeProductModal() {
    const productModal = document.getElementById('product-modal');
    productModal.classList.remove('active');
    document.body.style.overflow = '';
}

function generateFeaturesList(product) {
    let featuresHTML = '';

    if (product.features && product.features.length > 0) {
        const shown = product.features.slice(0, 4);
        const hidden = product.features.slice(4);

        shown.forEach(f => {
            featuresHTML += `
    <li class="feature-item">
      <i class="fas fa-check-circle"></i>
      <span>${f}</span>
    </li>
  `;
        });

        if (hidden.length > 0) {
            featuresHTML += `
    <div class="feature-hidden" id="feature-hidden" style="display: none;">
      ${hidden.map(f => `
        <li class="feature-item">
          <i class="fas fa-check-circle"></i>
          <span>${f}</span>
        </li>
      `).join('')}
    </div>
    <button id="toggle-features" class="toggle-btn">Afișează mai mult</button>
  `;
        }

    } else {
        if (product.category === 'phone' || product.category === 'tablet') {
            featuresHTML += `
                                                <li class="feature-item"><i class="fas fa-check-circle"></i> <span>Ecran de înaltă rezoluție</span></li>
                                                <li class="feature-item"><i class="fas fa-check-circle"></i> <span>Cameră performantă</span></li>
                                                <li class="feature-item"><i class="fas fa-check-circle"></i> <span>Baterie de lungă durată</span></li>
                                                <li class="feature-item"><i class="fas fa-check-circle"></i> <span>Procesor rapid</span></li>
                                                <li class="feature-item"><i class="fas fa-check-circle"></i> <span>Spațiu de stocare generos</span></li>
                                                <li class="feature-item"><i class="fas fa-check-circle"></i> <span>Conectivitate 5G</span></li>
                                            `;
        } else if (product.category === 'laptop') {
            featuresHTML += `
                                                <li class="feature-item"><i class="fas fa-check-circle"></i> <span>Procesor performant</span></li>
                                                <li class="feature-item"><i class="fas fa-check-circle"></i> <span>Memorie RAM suficientă</span></li>
                                                <li class="feature-item"><i class="fas fa-check-circle"></i> <span>SSD rapid</span></li>
                                                <li class="feature-item"><i class="fas fa-check-circle"></i> <span>Ecran de calitate</span></li>
                                                <li class="feature-item"><i class="fas fa-check-circle"></i> <span>Tastatură confortabilă</span></li>
                                                <li class="feature-item"><i class="fas fa-check-circle"></i> <span>Autonomie ridicată</span></li>
                                            `;
        } else if (product.category === 'watch') {
            featuresHTML += `
                                                <li class="feature-item"><i class="fas fa-check-circle"></i> <span>Monitorizare activitate fizică</span></li>
                                                <li class="feature-item"><i class="fas fa-check-circle"></i> <span>Monitorizare ritm cardiac</span></li>
                                                <li class="feature-item"><i class="fas fa-check-circle"></i> <span>Rezistent la apă</span></li>
                                                <li class="feature-item"><i class="fas fa-check-circle"></i> <span>Notificări inteligente</span></li>
                                                <li class="feature-item"><i class="fas fa-check-circle"></i> <span>Autonomie excelentă</span></li>
                                                <li class="feature-item"><i class="fas fa-check-circle"></i> <span>Design elegant</span></li>
                                            `;
        } else {
            featuresHTML += `
                                                <li class="feature-item"><i class="fas fa-check-circle"></i> <span>Calitate premium</span></li>
                                                <li class="feature-item"><i class="fas fa-check-circle"></i> <span>Design modern</span></li>
                                                <li class="feature-item"><i class="fas fa-check-circle"></i> <span>Funcționalități avansate</span></li>
                                                <li class="feature-item"><i class="fas fa-check-circle"></i> <span>Performanță excelentă</span></li>
                                                <li class="feature-item"><i class="fas fa-check-circle"></i> <span>Fiabilitate ridicată</span></li>
                                                <li class="feature-item"><i class="fas fa-check-circle"></i> <span>Raport calitate-preț bun</span></li>
                                            `;
        }
    }

    if (product.color) {
        featuresHTML += `
                                            <li class="feature-item">
                                                <i class="fas fa-check-circle"></i>
                                                <span>Culoare: ${product.color}</span>
                                            </li>
                                        `;
    }

    return featuresHTML;
}

function initProductGallery() {
    const thumbnails = document.querySelectorAll('.product-thumbnail');
    const mainImage = document.querySelector('.product-main-image img');

    thumbnails.forEach(thumbnail => {
        thumbnail.addEventListener('click', function() {
            thumbnails.forEach(t => t.classList.remove('active'));
            this.classList.add('active');

            const newImageSrc = this.querySelector('img').src;
            mainImage.src = newImageSrc;
        });
    });
}


let currentPage = 1;
let currentFilter = 'all';
let hasMoreProducts = true;

function loadProducts(filter = 'all', resetPage = true) {
    if (resetPage) {
        currentPage = 1;
        hasMoreProducts = true;
    }

    currentFilter = filter;

    const productsContainer = document.getElementById('products-container');
    const emptyResults = document.querySelector('.empty-results');
    const loadMoreBtn = document.getElementById('load-more');

    if (resetPage) {
        productsContainer.innerHTML = `
            <div class="loading-spinner">
                <i class="fas fa-spinner fa-spin"></i>
                <p>Se încarcă produsele...</p>
            </div>
        `;
    }

    emptyResults.style.display = 'none';

    let normalizedCategory = null;
    if (filter !== 'all') {
        const categoryMap = {
            phone: 'Telefoane',
            tablet: 'Tablete',
            laptop: 'Laptopuri',
            watch: 'Smartwatch-uri',
            pc: 'Componente PC',
            periferice: 'Periferice',
            audio: 'Audio',
            drone: 'Drone'
        };
        normalizedCategory = categoryMap[filter] || filter;
    }

    let params = `?page=${currentPage}&limit=8`;
    if (normalizedCategory) {
        params += `&category=${encodeURIComponent(normalizedCategory)}`;
    }

    fetch(`/api/products${params}`)
        .then(response => response.json())
        .then(data => {
            if (resetPage) productsContainer.innerHTML = '';

            if (data.success && data.products && data.products.length > 0) {
                data.products.forEach(product => {
                    const productCard = createProductCard(product);
                    productsContainer.appendChild(productCard);
                });

                hasMoreProducts = data.page < data.totalPages;
                loadMoreBtn.style.display = hasMoreProducts ? 'inline-block' : 'none';
            } else {
                if (resetPage) {
                    emptyResults.style.display = 'block';
                    loadMoreBtn.style.display = 'none';
                }
            }
        })
        .catch(error => {
            console.error('Eroare la încărcarea produselor:', error);
            productsContainer.innerHTML = `
                <div class="error-message">
                    <i class="fas fa-exclamation-circle"></i>
                    <h3>Eroare la încărcarea produselor</h3>
                    <p>A apărut o eroare în comunicarea cu serverul. Te rugăm să încerci din nou.</p>
                </div>
            `;
            loadMoreBtn.style.display = 'none';
        });
}

document.addEventListener('DOMContentLoaded', function () {
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') {
                const query = searchInput.value.trim();
                if (query.length > 0) {
                    window.location.href = `/products?search=${encodeURIComponent(query)}`;
                }
            }
        });
    }
});

function loadMoreProducts() {
    if (hasMoreProducts) {
        currentPage++;
        loadProducts(currentFilter, false);
    }
}

function createProductCard(product) {
    const productCard = document.createElement('div');
    productCard.className = 'product-card';
    productCard.setAttribute('data-id', product._id);

    productCard.innerHTML = `
                                        <div class="product-image">
                                            <img src="${product.image || 'https://via.placeholder.com/300x200?text=No+Image'}" alt="${product.name}">
                                            <div class="product-badge badge-new">Nou</div>
                                        </div>
                                        <div class="product-info">
                                            <div class="product-category">${product.category || 'General'}</div>
                                            <h3 class="product-title">${product.name}</h3>
                                            <div class="product-features">
                                                <span class="feature">
                                                    <i class="fas fa-microchip"></i>
                                                    ${product.brand || 'Brand'}
                                                </span>
                                                <span class="feature">
                                                    <i class="fas fa-palette"></i>
                                                    ${product.color || 'Diverse culori'}
                                                </span>
                                            </div>
                                            <div class="product-price">
                                                <span class="current-price">${product.price.toFixed(2)} EUR</span>
                                                <span class="old-price">${(product.price * 1.2).toFixed(2)} EUR</span>
                                                <span class="discount">-20%</span>
                                            </div>
                                            <div class="product-actions">
                                                <a href="#" class="details-btn" data-id="${product._id}">Detalii <i class="fas fa-arrow-right"></i></a>
                                                <button class="favorite-btn" data-id="${product._id}">
                                                    <i class="far fa-heart"></i>
                                                </button>
                                            </div>
                                        </div>
                                    `;

    const detailsBtn = productCard.querySelector('.details-btn');
    detailsBtn.addEventListener('click', function(e) {
        e.preventDefault();
        const productId = this.getAttribute('data-id');
        openProductModal(productId);
    });

    const favoriteBtn = productCard.querySelector('.favorite-btn');
    favoriteBtn.addEventListener('click', function() {
        this.classList.toggle('active');
        const icon = this.querySelector('i');
        if (this.classList.contains('active')) {
            icon.className = 'fas fa-heart';
        } else {
            icon.className = 'far fa-heart';
        }
    });

    return productCard;
}

function loadNews() {
    const newsContainer = document.getElementById('news-container');

    newsContainer.innerHTML = `
                                        <div class="loading-spinner">
                                            <i class="fas fa-spinner fa-spin"></i>
                                            <p>Se încarcă știrile...</p>
                                        </div>
                                    `;

    fetch('/api/news/latest/3')
        .then(response => response.json())
        .then(data => {
            newsContainer.innerHTML = '';

            if (data.success && data.news && data.news.length > 0) {
                data.news.forEach(newsItem => {
                    const newsCard = createNewsCard(newsItem);
                    newsContainer.appendChild(newsCard);
                });
            } else {
                const placeholderNews = [
                    {
                        title: 'Noile telefoane Samsung Galaxy S24 sunt disponibile în România',
                        excerpt: 'Samsung a lansat noua serie Galaxy S24, cu funcții avansate de AI și ecran îmbunătățit. Aflați tot ce trebuie să știți despre noile flagship-uri.',
                        publishDate: new Date(),
                        imageUrl: 'https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1170&q=80'
                    },
                    {
                        title: 'Apple ar putea lansa un nou MacBook Pro cu cip M3 în această toamnă',
                        excerpt: 'Potrivit unor surse din industrie, Apple se pregătește să lanseze o nouă generație de MacBook Pro cu procesorul M3, care va oferi performanțe superioare.',
                        publishDate: new Date(),
                        imageUrl: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1026&q=80'
                    },
                    {
                        title: 'Tehnologia 5G se extinde în mai multe orașe din România',
                        excerpt: 'Operatorii de telefonie mobilă continuă extinderea rețelelor 5G în România. Află care sunt noile orașe acoperite și ce beneficii aduce tehnologia 5G.',
                        publishDate: new Date(),
                        imageUrl: 'https://images.unsplash.com/photo-1562408590-e32931084e23?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1170&q=80'
                    }
                ];

                placeholderNews.forEach(newsItem => {
                    const newsCard = document.createElement('div');
                    newsCard.className = 'news-card';

                    newsCard.innerHTML = `
                                                        <div class="news-image">
                                                            <img src="${newsItem.imageUrl}" alt="${newsItem.title}">
                                                        </div>
                                                        <div class="news-content">
                                                            <div class="news-date">${formatDate(newsItem.publishDate)}</div>
                                                            <h3 class="news-title">${newsItem.title}</h3>
                                                            <p class="news-excerpt">${newsItem.excerpt}</p>
                                                            <a href="#" class="read-more">Citește mai mult <i class="fas fa-arrow-right"></i></a>
                                                        </div>
                                                    `;

                    newsContainer.appendChild(newsCard);
                });
            }
        })
        .catch(error => {
            console.error('Eroare la încărcarea știrilor:', error);
            newsContainer.innerHTML = `
                                                <div class="error-message">
                                                    <i class="fas fa-exclamation-circle"></i>
                                                    <h3>Eroare la încărcarea știrilor</h3>
                                                    <p>A apărut o eroare în comunicarea cu serverul. Te rugăm să încerci din nou.</p>
                                                </div>
                                            `;
        });
}

function createNewsCard(newsItem) {
    const newsCard = document.createElement('div');
    newsCard.className = 'news-card';

    const publishDate = new Date(newsItem.publishDate);
    const formattedDate = formatDate(publishDate);

    newsCard.innerHTML = `
                                        <div class="news-image">
                                            <img src="${newsItem.imageUrl || 'https://via.placeholder.com/600x400?text=No+Image'}" alt="${newsItem.title}">
                                        </div>
                                        <div class="news-content">
                                            <div class="news-date">${formattedDate}</div>
                                            <h3 class="news-title">${newsItem.title}</h3>
                                            <p class="news-excerpt">${newsItem.description || newsItem.content?.substring(0, 150) + '...' || 'Nu există descriere disponibilă.'}</p>
                                            <a href="${newsItem.url}" target="_blank" class="read-more">Citește mai mult <i class="fas fa-arrow-right"></i></a>
                                        </div>
                                    `;

    return newsCard;
}

function formatDate(date) {
    return new Intl.DateTimeFormat('ro-RO', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    }).format(date);
}

function logout() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');

    window.location.href = '/';
}

