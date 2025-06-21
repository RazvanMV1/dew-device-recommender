
document.addEventListener('DOMContentLoaded', function() {
    const checkAuth = () => {
        const authToken = localStorage.getItem('authToken');
        if (!authToken) {
            window.location.href = '/login';
            return false;
        }
        return true;
    };

    if (!checkAuth()) return;

    const state = {
        news: {
            currentPage: 1,
            totalPages: 1,
            items: [],
            loading: false,
            filters: {
                search: '',
                source: '',
                category: '',
                processed: '',
                sort: 'publishDate:desc'
            }
        },
        sources: {
            items: [],
            loading: false
        },
        categories: {
            items: [],
            loading: false
        },
        products: {
            items: [],
            selected: [],
            loading: false
        },
        stats: {
            totalNews: 0,
            processedNews: 0,
            sources: 0,
            categories: 0
        },
        currentNewsId: null
    };

    initPage();

    function initPage() {
        loadNewsStats();
        loadRssSources();
        loadNewsCategories();
        loadNews();
        attachEventHandlers();
    }

    async function loadNewsStats() {
        try {
            const response = await fetch('/api/news/stats', {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
            });
            const data = await response.json();

            if (data.success) {
                state.stats = data.stats;
                updateStatsUI();
            }
        } catch (error) {
            console.error('Eroare la încărcarea statisticilor despre știri:', error);
        }
    }

    function updateStatsUI() {
        document.getElementById('total-news-count').textContent = state.stats.totalNews;
        document.getElementById('processed-news-count').textContent = state.stats.processedNews;
        document.getElementById('rss-sources-count').textContent = state.stats.sources;
        document.getElementById('categories-count').textContent = state.stats.categories;
    }

    async function loadRssSources() {
        try {
            state.sources.loading = true;

            const response = await fetch('/api/sources?type=rss', {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
            });
            const data = await response.json();

            if (data.success) {
                state.sources.items = data.sources;
                updateSourcesUI();
                populateSourceFilter();
            }

            state.sources.loading = false;
        } catch (error) {
            console.error('Eroare la încărcarea surselor RSS:', error);
            state.sources.loading = false;
        }
    }

    function updateSourcesUI() {
        const sourcesGrid = document.getElementById('rss-sources-grid');

        if (state.sources.loading) {
            sourcesGrid.innerHTML = `
                <div class="loading-indicator">
                    <i class="fas fa-spinner fa-spin"></i>
                    <p>Se încarcă sursele RSS...</p>
                </div>
            `;
            return;
        }

        if (state.sources.items.length === 0) {
            sourcesGrid.innerHTML = `
                <div class="no-data-message">
                    <i class="fas fa-exclamation-circle"></i>
                    <p>Nu există surse RSS active.</p>
                </div>
            `;
            return;
        }

        sourcesGrid.innerHTML = '';
        state.sources.items.forEach(source => {
            if (source.active) {
                const sourceCard = document.createElement('div');
                sourceCard.className = 'rss-source-card';

                const lastUpdated = source.lastUpdated
                    ? new Date(source.lastUpdated).toLocaleDateString('ro-RO', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    })
                    : 'Niciodată';

                sourceCard.innerHTML = `
                    <div class="rss-source-header">
                        <div class="rss-source-icon">
                            <i class="fas fa-rss"></i>
                        </div>
                        <h4>${source.name}</h4>
                    </div>
                    <div class="rss-source-details">
                        <p><strong>URL:</strong> <a href="${source.url}" target="_blank">${truncateText(source.url, 30)}</a></p>
                        <p><strong>Frecvență:</strong> ${source.updateFrequency || 60} minute</p>
                        <p><strong>Ultima actualizare:</strong> ${lastUpdated}</p>
                    </div>
                    <div class="rss-source-actions">
                        <button class="btn-sm btn-primary update-source-btn" data-id="${source._id}">
                            <i class="fas fa-sync"></i> Actualizează
                        </button>
                    </div>
                `;

                sourcesGrid.appendChild(sourceCard);
            }
        });

        const updateButtons = document.querySelectorAll('.update-source-btn');
        updateButtons.forEach(button => {
            button.addEventListener('click', async function() {
                const sourceId = this.getAttribute('data-id');
                await updateRssSource(sourceId);
            });
        });
    }

    function populateSourceFilter() {
        const sourceFilter = document.getElementById('news-source-filter');
        sourceFilter.innerHTML = '<option value="">Toate sursele</option>';

        state.sources.items
            .filter(source => source.active)
            .forEach(source => {
                const option = document.createElement('option');
                option.value = source._id;
                option.textContent = source.name;
                sourceFilter.appendChild(option);
            });
    }

    async function loadNewsCategories() {
        try {
            state.categories.loading = true;

            const response = await fetch('/api/news/categories', {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
            });
            const data = await response.json();

            if (data.success) {
                state.categories.items = data.categories;
                populateCategoryFilter();
            }

            state.categories.loading = false;
        } catch (error) {
            console.error('Eroare la încărcarea categoriilor de știri:', error);
            state.categories.loading = false;
        }
    }

    function populateCategoryFilter() {
        const categoryFilter = document.getElementById('news-category-filter');
        categoryFilter.innerHTML = '<option value="">Toate categoriile</option>';

        state.categories.items.forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = category.charAt(0).toUpperCase() + category.slice(1);
            categoryFilter.appendChild(option);
        });
    }

    async function loadNews() {
        try {
            state.news.loading = true;
            updateNewsLoadingState(true);

            const { currentPage, filters } = state.news;
            const { search, source, category, processed, sort } = filters;

            let queryParams = `page=${currentPage}&limit=10&sort=${sort}`;
            if (search) queryParams += `&search=${encodeURIComponent(search)}`;
            if (source) queryParams += `&source=${source}`;
            if (category) queryParams += `&category=${encodeURIComponent(category)}`;
            if (processed !== '') queryParams += `&processed=${processed}`;

            const response = await fetch(`/api/news?${queryParams}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
            });
            const data = await response.json();

            if (data.success) {
                state.news.items = data.news;
                state.news.totalPages = data.totalPages;
                state.news.currentPage = data.page;

                updateNewsTable();
                updateNewsPagination();

                document.getElementById('news-total-count').textContent = `${data.total} știri`;
            } else {
                console.error('Eroare la încărcarea știrilor:', data.message);
            }

            state.news.loading = false;
            updateNewsLoadingState(false);
        } catch (error) {
            console.error('Eroare la încărcarea știrilor:', error);
            state.news.loading = false;
            updateNewsLoadingState(false);
        }
    }

    function updateNewsLoadingState(isLoading) {
        const loadingIndicator = document.getElementById('news-loading');
        const newsTable = document.getElementById('news-table');

        if (isLoading) {
            loadingIndicator.style.display = 'flex';
            newsTable.style.opacity = '0.5';
        } else {
            loadingIndicator.style.display = 'none';
            newsTable.style.opacity = '1';
        }
    }

    function updateNewsTable() {
        const tableBody = document.getElementById('news-table-body');
        tableBody.innerHTML = '';

        if (state.news.items.length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td colspan="7" class="text-center">
                    <div class="no-data-message">
                        <i class="fas fa-newspaper"></i>
                        <p>Nu s-au găsit știri care să corespundă criteriilor.</p>
                    </div>
                </td>
            `;
            tableBody.appendChild(row);
            return;
        }

        state.news.items.forEach(news => {
            const row = document.createElement('tr');

            const publishDate = new Date(news.publishDate);
            const formattedDate = publishDate.toLocaleDateString('ro-RO', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });

            const categories = news.categories && news.categories.length > 0
                ? news.categories.map(cat => `<span class="category-tag">${cat}</span>`).join('')
                : '<span class="text-muted">Fără categorii</span>';

            const statusClass = news.isProcessed ? 'status-active' : 'status-inactive';
            const statusText = news.isProcessed ? 'Procesat' : 'Neprocesat';

            row.innerHTML = `
                <td>
                    <div class="table-image">
                        ${news.imageUrl
                            ? `<img src="${news.imageUrl}" alt="${news.title}" loading="lazy">`
                            : '<div class="no-image"><i class="fas fa-image"></i></div>'}
                    </div>
                </td>
                <td><div class="news-title">${news.title}</div></td>
                <td>${news.sourceName || 'Necunoscută'}</td>
                <td><div class="categories-container">${categories}</div></td>
                <td>${formattedDate}</td>
                <td><span class="status ${statusClass}">${statusText}</span></td>
                <td>
                    <div class="table-actions">
                        <button class="action-btn view" data-id="${news._id}">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="action-btn link" onclick="window.open('${news.url}', '_blank')">
                            <i class="fas fa-external-link-alt"></i>
                        </button>
                        ${!news.isProcessed ? `
                            <button class="action-btn process" data-id="${news._id}">
                                <i class="fas fa-check"></i>
                            </button>
                        ` : `
                            <button class="action-btn edit" data-id="${news._id}">
                                <i class="fas fa-edit"></i>
                            </button>
                        `}
                    </div>
                </td>
            `;

            tableBody.appendChild(row);
        });

        const viewButtons = tableBody.querySelectorAll('.action-btn.view');
        viewButtons.forEach(button => {
            button.addEventListener('click', function() {
                const newsId = this.getAttribute('data-id');
                openNewsDetailModal(newsId);
            });
        });

        const processButtons = tableBody.querySelectorAll('.action-btn.process');
        processButtons.forEach(button => {
            button.addEventListener('click', function() {
                const newsId = this.getAttribute('data-id');
                openRelatedProductsModal(newsId);
            });
        });

        const editButtons = tableBody.querySelectorAll('.action-btn.edit');
        editButtons.forEach(button => {
            button.addEventListener('click', function() {
                const newsId = this.getAttribute('data-id');
                editRelatedProducts(newsId);
            });
        });
    }

    function updateNewsPagination() {
        const { currentPage, totalPages } = state.news;

        document.getElementById('news-current-page').textContent = currentPage;
        document.getElementById('news-total-pages').textContent = totalPages;

        document.getElementById('news-prev-page').disabled = currentPage <= 1;
        document.getElementById('news-next-page').disabled = currentPage >= totalPages;
    }

    async function updateRssSource(sourceId) {
        try {
            const button = document.querySelector(`.update-source-btn[data-id="${sourceId}"]`);

            button.disabled = true;
            button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Actualizare...';

            const response = await fetch('/api/rss/process', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                },
                body: JSON.stringify({ sourceId })
            });

            const data = await response.json();

            if (data.success) {
                loadRssSources();
                loadNews();
                loadNewsStats();
                showToast('Sursă actualizată cu succes!', 'success');
            } else {
                showToast('Eroare la actualizarea sursei: ' + data.message, 'error');
            }

            button.disabled = false;
            button.innerHTML = '<i class="fas fa-sync"></i> Actualizează';
        } catch (error) {
            console.error('Eroare la actualizarea sursei RSS:', error);
            showToast('Eroare la actualizarea sursei!', 'error');
            const button = document.querySelector(`.update-source-btn[data-id="${sourceId}"]`);
            if (button) {
                button.disabled = false;
                button.innerHTML = '<i class="fas fa-sync"></i> Actualizează';
            }
        }
    }

    async function openNewsDetailModal(newsId) {
        state.currentNewsId = newsId;

        const modal = document.getElementById('news-detail-modal');
        modal.classList.add('active');

        const modalContent = document.getElementById('news-detail-content');
        modalContent.innerHTML = `
            <div class="loading-indicator">
                <i class="fas fa-spinner fa-spin"></i>
                <p>Se încarcă detaliile știrii...</p>
            </div>
        `;

        try {
            const response = await fetch(`/api/news/${newsId}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
            });
            const data = await response.json();

            if (data.success && data.news) {
                const news = data.news;

                const publishDate = new Date(news.publishDate);
                const formattedDate = publishDate.toLocaleDateString('ro-RO', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });

                const categories = news.categories && news.categories.length > 0
                    ? news.categories.map(cat => `<span class="category-tag">${cat}</span>`).join('')
                    : '<span class="text-muted">Fără categorii</span>';

                modalContent.innerHTML = `
                    <div class="news-detail">
                        <div class="news-detail-header">
                            <h2 class="news-detail-title">${news.title}</h2>
                            <div class="news-meta">
                                <span class="news-source">${news.sourceName || 'Sursă necunoscută'}</span>
                                <span class="news-date">${formattedDate}</span>
                                <span class="news-author">${news.author || 'Autor necunoscut'}</span>
                            </div>
                            <div class="news-categories">
                                ${categories}
                            </div>
                        </div>

                        <div class="news-detail-content">
                            ${news.imageUrl ? `
                                <div class="news-detail-image">
                                    <img src="${news.imageUrl}" alt="${news.title}">
                                </div>
                            ` : ''}

                            <div class="news-detail-description">
                                <h4>Descriere</h4>
                                <p>${news.description || 'Nu există descriere.'}</p>
                            </div>

                            ${news.content ? `
                                <div class="news-detail-full-content">
                                    <h4>Conținut complet</h4>
                                    <div class="content-box">
                                        ${news.content}
                                    </div>
                                </div>
                            ` : ''}

                            <div class="news-detail-link">
                                <a href="${news.url}" target="_blank" class="btn-link">
                                    <i class="fas fa-external-link-alt"></i> Deschide articolul original
                                </a>
                            </div>
                        </div>

                        ${news.isProcessed ? `
                            <div class="news-related-products">
                                <h4>Produse asociate</h4>
                                <div class="related-products-list" id="detail-related-products">
                                    ${await renderRelatedProducts(news.relatedProducts)}
                                </div>
                            </div>
                        ` : ''}
                    </div>
                `;

                const processButton = document.getElementById('mark-processed-btn');
                if (news.isProcessed) {
                    processButton.textContent = 'Editează produse asociate';
                    processButton.onclick = function() {
                        closeModal('news-detail-modal');
                        editRelatedProducts(newsId);
                    };
                } else {
                    processButton.textContent = 'Marchează ca procesat';
                    processButton.onclick = function() {
                        closeModal('news-detail-modal');
                        openRelatedProductsModal(newsId);
                    };
                }
            } else {
                modalContent.innerHTML = `
                    <div class="error-message">
                        <i class="fas fa-exclamation-circle"></i>
                        <p>Nu s-au putut încărca detaliile știrii.</p>
                    </div>
                `;
            }
        } catch (error) {
            console.error('Eroare la încărcarea detaliilor știrii:', error);
            modalContent.innerHTML = `
                <div class="error-message">
                    <i class="fas fa-exclamation-circle"></i>
                    <p>A apărut o eroare la încărcarea detaliilor.</p>
                </div>
            `;
        }
    }

    async function renderRelatedProducts(productIds) {
        if (!productIds || productIds.length === 0) {
            return `<p class="no-items-message">Nu există produse asociate</p>`;
        }

        try {
            const products = await Promise.all(
                productIds.map(async id => {
                    try {
                        const response = await fetch(`/api/products/${id}`, {
                            headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
                        });
                        const data = await response.json();
                        return data.success ? data.product : null;
                    } catch (error) {
                        console.error(`Eroare la încărcarea produsului ${id}:`, error);
                        return null;
                    }
                })
            );

            const validProducts = products.filter(p => p !== null);

            if (validProducts.length === 0) {
                return `<p class="no-items-message">Nu există produse asociate</p>`;
            }

            return validProducts.map(product => `
                <div class="related-product-item">
                    <div class="related-product-image">
                        ${product.image
                            ? `<img src="${product.image}" alt="${product.name}">`
                            : `<div class="no-image"><i class="fas fa-image"></i></div>`
                        }
                    </div>
                    <div class="related-product-info">
                        <h5>${product.name}</h5>
                        <p class="product-category">${product.category || 'Fără categorie'}</p>
                        <p class="product-price">${product.price.toFixed(2)} RON</p>
                    </div>
                </div>
            `).join('');
        } catch (error) {
            console.error('Eroare la renderarea produselor asociate:', error);
            return `<p class="error-message">Eroare la încărcarea produselor asociate</p>`;
        }
    }

    async function openRelatedProductsModal(newsId) {
        state.currentNewsId = newsId;

        const modal = document.getElementById('related-products-modal');
        modal.classList.add('active');

        state.products.selected = [];

        await loadAvailableProducts();

        updateSelectedProductsUI();
    }

    async function editRelatedProducts(newsId) {
        state.currentNewsId = newsId;

        try {
            const response = await fetch(`/api/news/${newsId}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
            });
            const data = await response.json();

            if (data.success && data.news) {
                state.products.selected = data.news.relatedProducts || [];

                const modal = document.getElementById('related-products-modal');
                modal.classList.add('active');

                await loadAvailableProducts();

                updateSelectedProductsUI();

                updateProductsSelectionUI();
            } else {
                showToast('Eroare la încărcarea detaliilor știrii', 'error');
            }
        } catch (error) {
            console.error('Eroare la editarea produselor asociate:', error);
            showToast('Eroare la încărcarea detaliilor știrii', 'error');
        }
    }

    async function loadAvailableProducts() {
        try {
            state.products.loading = true;

            const tableBody = document.getElementById('products-selection-body');
            tableBody.innerHTML = `
                <tr>
                    <td colspan="4" class="text-center">
                        <div class="loading-indicator">
                            <i class="fas fa-spinner fa-spin"></i>
                            <p>Se încarcă produsele...</p>
                        </div>
                    </td>
                </tr>
            `;

            const response = await fetch('/api/products?limit=50', {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
            });
            const data = await response.json();

            if (data.success) {
                state.products.items = data.products;
                updateProductsSelectionUI();
            } else {
                tableBody.innerHTML = `
                    <tr>
                        <td colspan="4" class="text-center">
                            <div class="error-message">
                                <i class="fas fa-exclamation-circle"></i>
                                <p>Eroare la încărcarea produselor.</p>
                            </div>
                        </td>
                    </tr>
                `;
            }

            state.products.loading = false;
        } catch (error) {
            console.error('Eroare la încărcarea produselor disponibile:', error);
            const tableBody = document.getElementById('products-selection-body');
            tableBody.innerHTML = `
                <tr>
                    <td colspan="4" class="text-center">
                        <div class="error-message">
                            <i class="fas fa-exclamation-circle"></i>
                            <p>Eroare la încărcarea produselor.</p>
                        </div>
                    </td>
                </tr>
            `;
            state.products.loading = false;
        }
    }

    function updateProductsSelectionUI() {
        const tableBody = document.getElementById('products-selection-body');
        tableBody.innerHTML = '';

        if (state.products.items.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="4" class="text-center">
                        <div class="no-data-message">
                            <i class="fas fa-box-open"></i>
                            <p>Nu există produse disponibile.</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        const searchText = document.getElementById('product-search-input').value.toLowerCase();
        const filteredProducts = state.products.items.filter(product => {
            return product.name.toLowerCase().includes(searchText) ||
                   (product.brand && product.brand.toLowerCase().includes(searchText)) ||
                   (product.category && product.category.toLowerCase().includes(searchText));
        });

        if (filteredProducts.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="4" class="text-center">
                        <div class="no-data-message">
                            <i class="fas fa-search"></i>
                            <p>Nu s-au găsit produse care să corespundă criteriilor de căutare.</p>
                                                    </div>
                                                </td>
                                            </tr>
                                        `;
                                        return;
                                    }

                                    filteredProducts.forEach(product => {
                                        const row = document.createElement('tr');

                                        const isSelected = state.products.selected.includes(product._id);

                                        row.innerHTML = `
                                            <td>
                                                <input type="checkbox" class="product-checkbox" data-id="${product._id}" ${isSelected ? 'checked' : ''}>
                                            </td>
                                            <td>${product.name}</td>
                                            <td>${product.category || 'Necunoscută'}</td>
                                            <td>${product.price.toFixed(2)} RON</td>
                                        `;

                                        tableBody.appendChild(row);
                                    });

                                    const checkboxes = tableBody.querySelectorAll('.product-checkbox');
                                    checkboxes.forEach(checkbox => {
                                        checkbox.addEventListener('change', function() {
                                            const productId = this.getAttribute('data-id');

                                            if (this.checked) {
                                                if (!state.products.selected.includes(productId)) {
                                                    state.products.selected.push(productId);
                                                }
                                            } else {
                                                state.products.selected = state.products.selected.filter(id => id !== productId);
                                            }

                                            updateSelectedProductsUI();
                                        });
                                    });
                                }

                                function updateSelectedProductsUI() {
                                    const container = document.getElementById('selected-products-container');

                                    if (state.products.selected.length === 0) {
                                        container.innerHTML = '<p class="no-items-message">Nu sunt produse selectate</p>';
                                        return;
                                    }

                                    const selectedProducts = state.products.items.filter(product =>
                                        state.products.selected.includes(product._id)
                                    );

                                    if (selectedProducts.length === 0) {
                                        container.innerHTML = '<p class="no-items-message">Nu sunt produse selectate</p>';
                                        return;
                                    }

                                    container.innerHTML = '';
                                    selectedProducts.forEach(product => {
                                        const item = document.createElement('div');
                                        item.className = 'selected-product-item';

                                        item.innerHTML = `
                                            <div class="selected-product-info">
                                                <span class="product-name">${product.name}</span>
                                                <span class="product-price">${product.price.toFixed(2)} RON</span>
                                            </div>
                                            <button class="btn-sm btn-danger remove-product" data-id="${product._id}">
                                                <i class="fas fa-times"></i>
                                            </button>
                                        `;

                                        container.appendChild(item);
                                    });

                                    const removeButtons = container.querySelectorAll('.remove-product');
                                    removeButtons.forEach(button => {
                                        button.addEventListener('click', function() {
                                            const productId = this.getAttribute('data-id');

                                            state.products.selected = state.products.selected.filter(id => id !== productId);

                                            const checkbox = document.querySelector(`.product-checkbox[data-id="${productId}"]`);
                                            if (checkbox) {
                                                checkbox.checked = false;
                                            }

                                            updateSelectedProductsUI();
                                        });
                                    });
                                }

                                async function saveRelatedProducts() {
                                    try {
                                        const saveButton = document.getElementById('save-related-products');

                                        saveButton.disabled = true;
                                        saveButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Se salvează...';

                                        const response = await fetch(`/api/news/${state.currentNewsId}/process`, {
                                            method: 'PATCH',
                                            headers: {
                                                'Content-Type': 'application/json',
                                                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                                            },
                                            body: JSON.stringify({
                                                relatedProducts: state.products.selected
                                            })
                                        });

                                        const data = await response.json();

                                        if (data.success) {
                                            closeModal('related-products-modal');

                                            loadNews();
                                            loadNewsStats();

                                            showToast('Asocierile au fost salvate cu succes!', 'success');
                                        } else {
                                            showToast('Eroare la salvarea asocierilor: ' + data.message, 'error');
                                        }
                                        saveButton.disabled = false;
                                        saveButton.innerHTML = 'Salvează asocieri';
                                    } catch (error) {
                                        console.error('Eroare la salvarea produselor asociate:', error);
                                        showToast('Eroare la salvarea asocierilor!', 'error');

                                        const saveButton = document.getElementById('save-related-products');
                                        saveButton.disabled = false;
                                        saveButton.innerHTML = 'Salvează asocieri';
                                    }
                                }

                                function attachEventHandlers() {
                                    document.querySelectorAll('.close-modal, button[data-dismiss="modal"]').forEach(element => {
                                        element.addEventListener('click', function() {
                                            const modal = this.closest('.modal');
                                            closeModal(modal.id);
                                        });
                                    });

                                    document.getElementById('news-search').addEventListener('input', debounce(() => {
                                        state.news.filters.search = document.getElementById('news-search').value;
                                        state.news.currentPage = 1;
                                        loadNews();
                                    }, 500));

                                    document.getElementById('news-source-filter').addEventListener('change', function() {
                                        state.news.filters.source = this.value;
                                        state.news.currentPage = 1;
                                        loadNews();
                                    });

                                    document.getElementById('news-category-filter').addEventListener('change', function() {
                                        state.news.filters.category = this.value;
                                        state.news.currentPage = 1;
                                        loadNews();
                                    });

                                    document.getElementById('news-processed-filter').addEventListener('change', function() {
                                        state.news.filters.processed = this.value;
                                        state.news.currentPage = 1;
                                        loadNews();
                                    });

                                    document.getElementById('news-sort-filter').addEventListener('change', function() {
                                        state.news.filters.sort = this.value;
                                        state.news.currentPage = 1;
                                        loadNews();
                                    });

                                    document.getElementById('news-prev-page').addEventListener('click', function() {
                                        if (state.news.currentPage > 1) {
                                            state.news.currentPage--;
                                            loadNews();
                                        }
                                    });

                                    document.getElementById('news-next-page').addEventListener('click', function() {
                                        if (state.news.currentPage < state.news.totalPages) {
                                            state.news.currentPage++;
                                            loadNews();
                                        }
                                    });

                                    document.getElementById('refresh-rss-btn').addEventListener('click', async function() {
                                        this.disabled = true;
                                        this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Se actualizează...';

                                        try {
                                            const response = await fetch('/api/rss/process', {
                                                method: 'POST',
                                                headers: {
                                                    'Content-Type': 'application/json',
                                                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                                                },
                                                body: JSON.stringify({})
                                            });

                                            const data = await response.json();

                                            if (data.success) {
                                                loadRssSources();
                                                loadNews();
                                                loadNewsStats();

                                                showToast('Sursele RSS au fost actualizate cu succes!', 'success');
                                            } else {
                                                showToast('Eroare la actualizarea surselor RSS: ' + data.message, 'error');
                                            }
                                        } catch (error) {
                                            console.error('Eroare la actualizarea surselor RSS:', error);
                                            showToast('Eroare la actualizarea surselor RSS!', 'error');
                                        } finally {
                                            this.disabled = false;
                                            this.innerHTML = '<i class="fas fa-sync"></i> Actualizează RSS';
                                        }
                                    });

                                    document.getElementById('product-search-input').addEventListener('input', debounce(() => {
                                        updateProductsSelectionUI();
                                    }, 300));

                                    document.getElementById('select-all-products').addEventListener('change', function() {
                                        const checkboxes = document.querySelectorAll('.product-checkbox');

                                        checkboxes.forEach(checkbox => {
                                            checkbox.checked = this.checked;

                                            const productId = checkbox.getAttribute('data-id');

                                            if (this.checked) {
                                                if (!state.products.selected.includes(productId)) {
                                                    state.products.selected.push(productId);
                                                }
                                            } else {
                                                state.products.selected = state.products.selected.filter(id => id !== productId);
                                            }
                                        });

                                        updateSelectedProductsUI();
                                    });

                                    document.getElementById('save-related-products').addEventListener('click', saveRelatedProducts);
                                }

                                function closeModal(modalId) {
                                    document.getElementById(modalId).classList.remove('active');
                                }

                                function truncateText(text, length) {
                                    if (!text || text.length <= length) return text;
                                    return text.substring(0, length) + '...';
                                }

                                function showToast(message, type = 'info') {
                                    let toastContainer = document.querySelector('.toast-container');

                                    if (!toastContainer) {
                                        toastContainer = document.createElement('div');
                                        toastContainer.className = 'toast-container';
                                        document.body.appendChild(toastContainer);
                                    }

                                    const toast = document.createElement('div');
                                    toast.className = `toast toast-${type}`;

                                    let icon = 'info-circle';
                                    if (type === 'success') icon = 'check-circle';
                                    if (type === 'error') icon = 'exclamation-circle';
                                    if (type === 'warning') icon = 'exclamation-triangle';

                                    toast.innerHTML = `
                                        <i class="fas fa-${icon}"></i>
                                        <span class="toast-message">${message}</span>
                                        <button class="toast-close">&times;</button>
                                    `;

                                    toastContainer.appendChild(toast);

                                    toast.querySelector('.toast-close').addEventListener('click', () => {
                                        toast.classList.add('toast-hiding');
                                        setTimeout(() => {
                                            toast.remove();
                                        }, 300);
                                    });

                                    setTimeout(() => {
                                        toast.classList.add('toast-hiding');
                                        setTimeout(() => {
                                            toast.remove();
                                        }, 300);
                                    }, 5000);
                                }

                                function debounce(func, wait) {
                                    let timeout;
                                    return function() {
                                        const context = this;
                                        const args = arguments;
                                        clearTimeout(timeout);
                                        timeout = setTimeout(() => {
                                            func.apply(context, args);
                                        }, wait);
                                    };
                                }
                            });