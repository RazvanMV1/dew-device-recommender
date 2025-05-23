document.addEventListener('DOMContentLoaded', function() {
    // Inițializare pentru UI
    initUI();

    // Încarcă datele pentru produse și știri
    loadProducts();
    loadNews();

    // Adaugă eveniment pentru filtrare produse
    const filterBtns = document.querySelectorAll('.filter-btn');
    filterBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            // Elimină clasa active de pe toate butoanele
            filterBtns.forEach(b => b.classList.remove('active'));
            // Adaugă clasa active pe butonul curent
            this.classList.add('active');

            // Filtrează produsele după categoria selectată
            const filter = this.getAttribute('data-filter');
            loadProducts(filter);
        });
    });

    // Adaugă eveniment pentru butonul "Load More"
    document.getElementById('load-more').addEventListener('click', function() {
        loadMoreProducts();
    });

    // Inițializează butonul de scroll to top
    initScrollToTop();
});

// Funcție pentru inițializarea UI
function initUI() {
    // Verifică dacă utilizatorul este autentificat
    checkAuthStatus();

    // Inițializarea meniului utilizator
    const userMenuTrigger = document.getElementById('user-menu-trigger');
    const userMenu = document.getElementById('user-menu');

    userMenuTrigger.addEventListener('click', function() {
        userMenu.classList.toggle('active');
    });

    // Închide meniul la click în afara acestuia
    document.addEventListener('click', function(event) {
        if (!userMenu.contains(event.target) && !userMenuTrigger.contains(event.target)) {
            userMenu.classList.remove('active');
        }
    });

    // Inițializarea meniului mobil
    const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
    const mainNav = document.querySelector('.main-nav');

    mobileMenuToggle.addEventListener('click', function() {
        this.classList.toggle('active');
        mainNav.classList.toggle('active');
    });

    // Inițializare modal produs
    initProductModal();

    // Adaugă eveniment pentru butonul de logout
    const logoutLink = document.getElementById('logout-link');
    if (logoutLink) {
        logoutLink.addEventListener('click', function(e) {
            e.preventDefault();
            logout();
        });
    }
}

// Funcție pentru verificarea statusului de autentificare
function checkAuthStatus() {
    const authToken = localStorage.getItem('authToken');

    if (authToken) {
        try {
            // Obține datele utilizatorului din localStorage
            const userData = JSON.parse(localStorage.getItem('userData') || '{}');

            // Actualizează UI pentru utilizator autentificat
            document.getElementById('dropdown-user-name').textContent = userData.username || 'Utilizator';
            document.getElementById('dropdown-user-role').textContent = userData.role === 'admin' ? 'Administrator' : 'Membru';

            // Afișează link-urile pentru utilizator autentificat
            document.getElementById('profile-link').style.display = 'flex';
            document.getElementById('preferences-link').style.display = 'flex';
            document.getElementById('logout-link').style.display = 'flex';

            // Ascunde link-urile pentru utilizator neautentificat
            document.getElementById('auth-link').style.display = 'none';
            document.getElementById('register-link').style.display = 'none';

            // Actualizează textul din header
            const userNameElement = document.querySelector('.user-name');
            userNameElement.textContent = userData.username || 'Contul meu';

            // Adaugă link către dashboard pentru administratori
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

// Funcție pentru inițializarea butonului de scroll to top
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

// Funcție pentru inițializarea modalului de produs
function initProductModal() {
    const productModal = document.getElementById('product-modal');
    const closeModalBtn = productModal.querySelector('.close-modal');

    // Închide modal la click pe butonul de închidere
    closeModalBtn.addEventListener('click', function() {
        closeProductModal();
    });

    // Închide modal la click în afara conținutului
    productModal.addEventListener('click', function(e) {
        if (e.target === productModal) {
            closeProductModal();
        }
    });

    // Închide modal la apăsarea tastei Escape
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && productModal.classList.contains('active')) {
            closeProductModal();
        }
    });
}

// Funcție pentru deschiderea modalului cu detalii despre produs
function openProductModal(productId) {
    const productModal = document.getElementById('product-modal');
    const productDetailContainer = document.getElementById('product-detail-container');

    // Afișează loading spinner
    productDetailContainer.innerHTML = `
        <div class="loading-spinner">
            <i class="fas fa-spinner fa-spin"></i>
            <p>Se încarcă detaliile...</p>
        </div>
    `;

    // Activează modalul
    productModal.classList.add('active');
    document.body.style.overflow = 'hidden'; // Previne scrollarea în pagină

    // Încarcă detaliile produsului
    fetch(`/api/products/${productId}`)
        .then(response => response.json())
        .then(data => {
            if (data.success && data.product) {
                const product = data.product;

                // Generează HTML pentru detaliile produsului
                const productHTML = `
                    <div class="product-detail-content">
                        <div class="product-gallery">
                            <div class="product-main-image">
                                <img src="${product.image || 'https://via.placeholder.com/600x400?text=No+Image'}" alt="${product.name}">
                            </div>
                            <div class="product-thumbnails">
                                <div class="product-thumbnail active">
                                    <img src="${product.image || 'https://via.placeholder.com/600x400?text=No+Image'}" alt="${product.name}">
                                </div>
                                <!-- Placeholder thumbnails -->
                                <div class="product-thumbnail">
                                    <img src="https://via.placeholder.com/150?text=Image+2" alt="Thumbnail">
                                </div>
                                <div class="product-thumbnail">
                                    <img src="https://via.placeholder.com/150?text=Image+3" alt="Thumbnail">
                                </div>
                                <div class="product-thumbnail">
                                    <img src="https://via.placeholder.com/150?text=Image+4" alt="Thumbnail">
                                </div>
                            </div>
                        </div>
                        <div class="product-details-info">
                            <h2 class="product-detail-title">${product.name}</h2>
                            <div class="product-detail-brand">
                                <span>Brand:</span>
                                <a href="#brand/${product.brand}">${product.brand || 'Nespecificat'}</a>
                            </div>
                            <div class="product-rating">
                                <div class="stars">
                                    <i class="fas fa-star"></i>
                                    <i class="fas fa-star"></i>
                                    <i class="fas fa-star"></i>
                                    <i class="fas fa-star"></i>
                                    <i class="fas fa-star-half-alt"></i>
                                </div>
                                <span class="rating-count">(24 recenzii)</span>
                            </div>
                            <div class="product-detail-price">
                                                                <span class="detail-current-price">${product.price.toFixed(2)} RON</span>
                                                                <span class="detail-old-price">${(product.price * 1.2).toFixed(2)} RON</span>
                                                                <span class="detail-discount">-20%</span>
                                                            </div>
                                                            <div class="product-detail-description">
                                                                <p>${product.description || 'Acest produs nu are o descriere detaliată. Este un dispozitiv electronic ' + product.category + ' de înaltă calitate produs de ' + (product.brand || 'un producător cunoscut') + '.'}
                                                                </p>
                                                            </div>
                                                            <div class="product-detail-features">
                                                                <h4>Caracteristici principale</h4>
                                                                <ul class="feature-list">
                                                                    ${generateFeaturesList(product)}
                                                                </ul>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div class="product-comparable-models">
                                                        <h4>Modele similare</h4>
                                                        <div class="comparable-models-grid" id="comparable-models">
                                                            <!-- Placeholder pentru modele similare -->
                                                            <div class="comparable-model-card">
                                                                <div class="comparable-model-img">
                                                                    <img src="https://via.placeholder.com/80" alt="Model similar">
                                                                </div>
                                                                <div class="comparable-model-name">Model similar 1</div>
                                                                <div class="comparable-model-price">2199 RON</div>
                                                            </div>
                                                            <div class="comparable-model-card">
                                                                <div class="comparable-model-img">
                                                                    <img src="https://via.placeholder.com/80" alt="Model similar">
                                                                </div>
                                                                <div class="comparable-model-name">Model similar 2</div>
                                                                <div class="comparable-model-price">1899 RON</div>
                                                            </div>
                                                            <div class="comparable-model-card">
                                                                <div class="comparable-model-img">
                                                                    <img src="https://via.placeholder.com/80" alt="Model similar">
                                                                </div>
                                                                <div class="comparable-model-name">Model similar 3</div>
                                                                <div class="comparable-model-price">2499 RON</div>
                                                            </div>
                                                            <div class="comparable-model-card">
                                                                <div class="comparable-model-img">
                                                                    <img src="https://via.placeholder.com/80" alt="Model similar">
                                                                </div>
                                                                <div class="comparable-model-name">Model similar 4</div>
                                                                <div class="comparable-model-price">2099 RON</div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                `;

                                                // Actualizează conținutul modal
                                                productDetailContainer.innerHTML = productHTML;

                                                // Inițializare evenimente pentru galeria de imagini
                                                initProductGallery();

                                                // Încarcă produse similare
                                                loadSimilarProducts(product);
                                            } else {
                                                // Afișează mesaj de eroare
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

                                // Funcție pentru închiderea modalului de produs
                                function closeProductModal() {
                                    const productModal = document.getElementById('product-modal');
                                    productModal.classList.remove('active');
                                    document.body.style.overflow = ''; // Permite scrollarea în pagină
                                }

                                // Funcție pentru generarea listei de caracteristici
                                function generateFeaturesList(product) {
                                    let featuresHTML = '';

                                    // Adaugă caracteristici din array-ul de features, dacă există
                                    if (product.features && product.features.length > 0) {
                                        product.features.forEach(feature => {
                                            featuresHTML += `
                                                <li class="feature-item">
                                                    <i class="fas fa-check-circle"></i>
                                                    <span>${feature}</span>
                                                </li>
                                            `;
                                        });
                                    } else {
                                        // Caracteristici generice bazate pe categoria produsului
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
                                            // Caracteristici generice pentru alte categorii
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

                                    // Adaugă culoarea ca o caracteristică dacă există
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

                                // Funcție pentru inițializarea galeriei de imagini din modal
                                function initProductGallery() {
                                    const thumbnails = document.querySelectorAll('.product-thumbnail');
                                    const mainImage = document.querySelector('.product-main-image img');

                                    thumbnails.forEach(thumbnail => {
                                        thumbnail.addEventListener('click', function() {
                                            // Elimină clasa active de pe toate thumbnail-urile
                                            thumbnails.forEach(t => t.classList.remove('active'));
                                            // Adaugă clasa active pe thumbnail-ul curent
                                            this.classList.add('active');

                                            // Schimbă imaginea principală
                                            const newImageSrc = this.querySelector('img').src;
                                            mainImage.src = newImageSrc;
                                        });
                                    });
                                }

                                // Funcție pentru încărcarea produselor similare
                                function loadSimilarProducts(product) {
                                    // În implementarea reală, ai putea face un apel către API pentru a obține produse similare
                                    // Aici simulăm acest comportament pentru demonstrație

                                    // Categoria și brand-ul produsului curent pentru a găsi produse similare
                                    const category = product.category;
                                    const brand = product.brand;

                                    // Ar trebui să implementezi un endpoint în API pentru a obține produse similare
                                    // De exemplu: /api/products/similar?category=phone&brand=Samsung&exclude=123
                                }

                                // Funcție pentru încărcarea produselor
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

                                    // Afișează loading spinner doar la prima încărcare sau resetare
                                    if (resetPage) {
                                        productsContainer.innerHTML = `
                                            <div class="loading-spinner">
                                                <i class="fas fa-spinner fa-spin"></i>
                                                <p>Se încarcă produsele...</p>
                                            </div>
                                        `;
                                    }

                                    // Ascunde mesajul de rezultate goale
                                    emptyResults.style.display = 'none';

                                    // Construiește parametrii pentru cerere
                                    let params = `?page=${currentPage}&limit=8`;
                                    if (filter !== 'all') {
                                        params += `&category=${filter}`;
                                    }

                                    // Solicită produse de la API
                                    fetch(`/api/products${params}`)
                                        .then(response => response.json())
                                        .then(data => {
                                            // Elimină loading spinner
                                            if (resetPage) {
                                                productsContainer.innerHTML = '';
                                            }

                                            if (data.success && data.products && data.products.length > 0) {
                                                // Populează container-ul cu produse
                                                data.products.forEach(product => {
                                                    const productCard = createProductCard(product);
                                                    productsContainer.appendChild(productCard);
                                                });

                                                // Verifică dacă mai sunt produse de încărcat
                                                hasMoreProducts = data.page < data.totalPages;
                                                loadMoreBtn.style.display = hasMoreProducts ? 'inline-block' : 'none';
                                            } else {
                                                if (resetPage) {
                                                    // Afișează mesaj dacă nu există produse
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

                                // Funcție pentru încărcarea mai multor produse
                                function loadMoreProducts() {
                                    if (hasMoreProducts) {
                                        currentPage++;
                                        loadProducts(currentFilter, false);
                                    }
                                }

                                // Funcție pentru crearea cardului de produs
                                function createProductCard(product) {
                                    const productCard = document.createElement('div');
                                    productCard.className = 'product-card';
                                    productCard.setAttribute('data-id', product._id);

                                    // Generează HTML pentru card
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
                                                <span class="current-price">${product.price.toFixed(2)} RON</span>
                                                <span class="old-price">${(product.price * 1.2).toFixed(2)} RON</span>
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

                                    // Adaugă eveniment pentru deschiderea modalului
                                    const detailsBtn = productCard.querySelector('.details-btn');
                                    detailsBtn.addEventListener('click', function(e) {
                                        e.preventDefault();
                                        const productId = this.getAttribute('data-id');
                                        openProductModal(productId);
                                    });

                                    // Adaugă eveniment pentru butonul de favorite
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

                                // Funcție pentru încărcarea știrilor
                                function loadNews() {
                                    const newsContainer = document.getElementById('news-container');

                                    // Afișează loading spinner
                                    newsContainer.innerHTML = `
                                        <div class="loading-spinner">
                                            <i class="fas fa-spinner fa-spin"></i>
                                            <p>Se încarcă știrile...</p>
                                        </div>
                                    `;

                                    // Solicită știri de la API
                                    fetch('/api/news/latest/3') // Doar 3 știri recente
                                        .then(response => response.json())
                                        .then(data => {
                                            newsContainer.innerHTML = ''; // Curăță container-ul

                                            if (data.success && data.news && data.news.length > 0) {
                                                // Populează știrile
                                                data.news.forEach(newsItem => {
                                                    const newsCard = createNewsCard(newsItem);
                                                    newsContainer.appendChild(newsCard);
                                                });
                                            } else {
                                                // Afișează știri placeholder dacă nu există știri reale
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

                                // Funcție pentru crearea cardului de știri
                                function createNewsCard(newsItem) {
                                    const newsCard = document.createElement('div');
                                    newsCard.className = 'news-card';

                                    // Formatează data publicării
                                    const publishDate = new Date(newsItem.publishDate);
                                    const formattedDate = formatDate(publishDate);

                                    // Generează HTML pentru card
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

                                // Funcție pentru formatarea datei
                                function formatDate(date) {
                                    return new Intl.DateTimeFormat('ro-RO', {
                                        day: 'numeric',
                                        month: 'long',
                                        year: 'numeric'
                                    }).format(date);
                                }

                                // Funcție pentru deconectare
                                function logout() {
                                    // Șterge token-ul din localStorage
                                    localStorage.removeItem('authToken');
                                    localStorage.removeItem('userData');

                                    // Redirecționează către pagina principală
                                    window.location.href = '/';
                                }
