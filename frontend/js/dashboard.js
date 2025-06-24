let productsCurrentPage = 1;
let productsTotalPages = 1;
const productsPerPage = 10;
let sourcesCurrentPage = 1;
let sourcesTotalPages = 1;
const sourcesPerPage = 10;
let newsCurrentPage = 1;
let newsTotalPages = 1;
const newsPerPage = 10;
let usersCurrentPage = 1;
let usersTotalPages = 1;
const usersPerPage = 10;


document.addEventListener('DOMContentLoaded', function () {
    const checkAuth = () => {
        const authToken = localStorage.getItem('authToken');
        if (!authToken) {
            window.location.href = '/login';
            return false;
        }
        return true;
    };

    if (!checkAuth()) return;

    initUI();
    loadDashboardData();
    attachEventListeners();
    attachFilters();

    const form = document.getElementById('adminCreateUserForm');
    const alertBox = document.getElementById('userFormAlert');

    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            const userData = {
                username: form.username.value.trim(),
                email: form.email.value.trim(),
                password: form.password.value,
                role: form.role.value
            };

            const submitButton = form.querySelector('button[type="submit"]');
            const originalText = submitButton.innerHTML;
            submitButton.disabled = true;
            submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Se procesează...';

            try {
                const token = localStorage.getItem('authToken');
                const res = await fetch('/api/admin/users', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(userData)
                });

                const result = await res.json();
                alertBox.style.display = 'block';
                alertBox.textContent = result.message || (result.success ? 'Utilizator creat cu succes.' : 'Eroare la creare.');
                alertBox.className = result.success ? 'alert alert-success' : 'alert alert-error';

                if (result.success) {
                    form.reset();
                    loadUsers(1);
                }
            } catch (err) {
                alertBox.textContent = 'Eroare de rețea sau server.';
                alertBox.className = 'alert alert-error';
                alertBox.style.display = 'block';
            } finally {
                submitButton.disabled = false;
                submitButton.innerHTML = originalText;
            }
        });
    }
});

function initUI() {
    try {
        const userData = JSON.parse(localStorage.getItem('userData') || '{}');
        const userNameEl = document.getElementById('user-name');
        if (userNameEl) userNameEl.textContent = userData.username || 'Administrator';
        const userRoleEl = document.getElementById('user-role');
        if (userRoleEl) userRoleEl.textContent = userData.role === 'admin' ? 'Administrator' : 'Utilizator';

        const avatarEl = document.getElementById('user-avatar');
        if (avatarEl) {
            avatarEl.innerHTML = '';

            if (userData.avatar && typeof userData.avatar === "string" && userData.avatar.startsWith('http')) {
                const img = document.createElement('img');
                img.src = userData.avatar;
                img.alt = "Avatar";
                img.style.width = "48px";
                img.style.height = "48px";
                img.style.borderRadius = "50%";
                img.style.objectFit = "cover";
                img.onerror = function() {
                    avatarEl.innerHTML = '<i class="fas fa-user-circle"></i>';
                };
                avatarEl.appendChild(img);
            } else {
                avatarEl.innerHTML = '<i class="fas fa-user-circle"></i>';
            }
        }
    } catch (error) {
        console.error('Eroare la încărcarea datelor utilizatorului:', error);
    }

    const lastUpdateDate = document.getElementById('last-update-date');
    if (lastUpdateDate) {
        const now = new Date();
        lastUpdateDate.textContent = now.toLocaleDateString('ro-RO', {
            day: 'numeric',
            month: 'long',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    initSidebar();
}

function initSidebar() {
    const sidebar = document.getElementById('sidebar');
    const toggleSidebar = document.getElementById('toggle-sidebar');
    const navLinks = document.querySelectorAll('.sidebar-nav a');
    const pageTitle = document.getElementById('page-title');
    const currentPage = document.getElementById('current-page');

    if (toggleSidebar && sidebar) {
        toggleSidebar.addEventListener('click', () => {
            sidebar.classList.toggle('collapsed');
        });
    }

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const section = link.getAttribute('data-section');
            const sectionTitle = link.querySelector('span').textContent;

            const activeLi = document.querySelector('.sidebar-nav li.active');
            if (activeLi) activeLi.classList.remove('active');
            link.parentElement.classList.add('active');

            document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
            const sectionEl = document.getElementById(section);
            if (sectionEl) sectionEl.classList.add('active');

            if (pageTitle) pageTitle.textContent = sectionTitle;
            if (currentPage) currentPage.textContent = sectionTitle;

            if (section === 'products-section') {
                loadProducts(1);
            } else if (section === 'sources-section') {
                loadSources(1);
            } else if (section === 'news-section') {
                loadNews(1);
            }
            else if (section === 'users-section') {
                loadUsers(1);
            }
        });
    });
}


function attachEventListeners() {
    const logoutButton = document.getElementById('logout-button');
    if (logoutButton) logoutButton.addEventListener('click', logout);

    const dropdownLogout = document.getElementById('dropdown-logout');
    if (dropdownLogout) dropdownLogout.addEventListener('click', logout);

    const btnRefresh = document.querySelector('.btn-refresh');
    if (btnRefresh) btnRefresh.addEventListener('click', loadDashboardData);

    initModals();
    initForms();
}

function initModals() {
    const modals = ['product-modal', 'source-modal', 'confirm-modal']
        .map(id => document.getElementById(id)).filter(Boolean);

    modals.forEach(modal => {
        const closeBtn = modal.querySelector('.close-modal');
        const cancelBtn = modal.querySelector('button[id^="cancel-"]');
        if (closeBtn) closeBtn.addEventListener('click', () => closeModal(modal.id));
        if (cancelBtn) cancelBtn.addEventListener('click', () => closeModal(modal.id));
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal(modal.id);
        });
    });

    const addProductBtn = document.getElementById('add-product-btn');
    if (addProductBtn) addProductBtn.addEventListener('click', () => {
        document.getElementById('product-modal-title').textContent = 'Adaugă produs nou';
        document.getElementById('product-form').reset();
        document.getElementById('product-id').value = '';
        openModal('product-modal');
    });

    const addSourceBtn = document.getElementById('add-source-btn');
    if (addSourceBtn) addSourceBtn.addEventListener('click', () => {
        document.getElementById('source-modal-title').textContent = 'Adaugă sursă nouă';
        document.getElementById('source-form').reset();
        document.getElementById('source-id').value = '';
        openModal('source-modal');
    });
}

window.openModal = function (modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
};

window.closeModal = function (modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
};

function initForms() {
    const productForm = document.getElementById('product-form');
    const saveProductBtn = document.getElementById('save-product');

    if (productForm && saveProductBtn) {
        saveProductBtn.addEventListener('click', async (e) => {
            e.preventDefault();

            const priceStr = document.getElementById('product-price').value.trim().replace(',', '.');
            const price = parseFloat(priceStr);

            if (isNaN(price)) {
                alert("Prețul nu este valid!");
                return;
            }

            if (!productForm.checkValidity()) {
                productForm.reportValidity();
                return;
            }

            const productData = {
                name: document.getElementById('product-name').value.trim(),
                brand: document.getElementById('product-brand').value.trim(),
                category: document.getElementById('product-category').value.trim(),
                price: price,
                color: document.getElementById('product-color').value.trim(),
                image: document.getElementById('product-image').value.trim(),
                features: document.getElementById('product-features').value
                    .split('\n')
                    .map(f => f.trim())
                    .filter(f => f !== '')
            };

            const productId = document.getElementById('product-id').value;
            const isUpdate = productId !== '';

            try {
                const options = {
                    method: isUpdate ? 'PUT' : 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                    },
                    body: JSON.stringify(productData)
                };

                const url = isUpdate ? `/api/products/${productId}` : '/api/products';

                console.log('Trimitem către backend:', productData);

                const response = await fetch(url, options);
                const data = await response.json();

                if (data.success) {
                    closeModal('product-modal');
                    loadProducts();
                    alert(isUpdate ? 'Produs actualizat cu succes!' : 'Produs adăugat cu succes!');
                } else {
                    alert(`Eroare: ${data.message}`);
                }
            } catch (error) {
                console.error('Eroare la salvarea produsului:', error);
                alert('A apărut o eroare la salvarea produsului. Te rugăm să încerci din nou.');
            }
        });
    }

    const sourceForm = document.getElementById('source-form');
    const saveSourceBtn = document.getElementById('save-source');

    if (sourceForm && saveSourceBtn) {
        saveSourceBtn.addEventListener('click', async (e) => {
            e.preventDefault();

            if (!sourceForm.checkValidity()) {
                sourceForm.reportValidity();
                return;
            }

            const sourceData = {
                name: document.getElementById('source-name').value.trim(),
                type: document.getElementById('source-type').value.trim(),
                url: document.getElementById('source-url').value.trim(),
                description: document.getElementById('source-description').value.trim(),
                updateFrequency: parseInt(document.getElementById('source-update-freq').value),
                active: document.getElementById('source-active').value === 'true'
            };

            const sourceId = document.getElementById('source-id').value;
            const isUpdate = sourceId !== '';

            try {
                const options = {
                    method: isUpdate ? 'PUT' : 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                    },
                    body: JSON.stringify(sourceData)
                };

                const url = isUpdate ? `/api/sources/${sourceId}` : '/api/sources';

                const response = await fetch(url, options);
                const data = await response.json();

                if (data.success) {
                    closeModal('source-modal');
                    loadSources();
                    alert(isUpdate ? 'Sursă actualizată cu succes!' : 'Sursă adăugată cu succes!');
                } else {
                    alert(`Eroare: ${data.message}`);
                }
            } catch (error) {
                console.error('Eroare la salvarea sursei:', error);
                alert('A apărut o eroare la salvarea sursei. Te rugăm să încerci din nou.');
            }
        });
    }

    const confirmActionBtn = document.getElementById('confirm-action');
    if (confirmActionBtn) {
        confirmActionBtn.addEventListener('click', () => {
            const itemId = confirmActionBtn.getAttribute('data-id');
            const itemType = confirmActionBtn.getAttribute('data-type');

            if (itemId && itemType) {
                deleteItem(itemType, itemId);
            }
        });
    }
}

async function loadDashboardData() {
    try {
        await loadStats();
        await loadRecentActivity();
        const lastUpdateDate = document.getElementById('last-update-date');
        if (lastUpdateDate) {
            const now = new Date();
            lastUpdateDate.textContent = now.toLocaleDateString('ro-RO', {
                day: 'numeric',
                month: 'long',
                hour: '2-digit',
                minute: '2-digit'
            });
        }
    } catch (error) {
        console.error('Eroare la încărcarea datelor dashboard:', error);
    }
}

async function loadStats() {
    try {
        const [productsResponse, sourcesResponse, newsResponse, usersResponse] = await Promise.all([
            fetch('/api/products?limit=1'),
            fetch('/api/sources?limit=1'),
            fetch('/api/news?limit=1'),
            fetch('/api/users', {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
            })
        ]);
        const productsData = await productsResponse.json();
        const sourcesData = await sourcesResponse.json();
        const newsData = await newsResponse.json();

        document.getElementById('products-count').textContent = productsData.total || 0;
        document.getElementById('sources-count').textContent = sourcesData.total || 0;
        document.getElementById('news-count').textContent = newsData.total || 0;

        try {
            const usersData = await usersResponse.json();
            document.getElementById('users-count').textContent = usersData.total || 0;
        } catch (e) {
            document.getElementById('users-count').textContent = '1';
        }
    } catch (error) {
        console.error('Eroare la încărcarea statisticilor:', error);
        document.getElementById('products-count').textContent = '0';
        document.getElementById('sources-count').textContent = '0';
        document.getElementById('news-count').textContent = '0';
        document.getElementById('users-count').textContent = '0';
    }
}

async function loadRecentActivity() {
    const activityList = document.getElementById('activity-list');
    if (!activityList) return;
    activityList.innerHTML = '';

    try {
        const response = await fetch('/api/activity', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
        });
        const data = await response.json();

        if (!data.success) {
            activityList.innerHTML = '<div class="error">Nu s-au putut încărca activitățile recente.</div>';
            return;
        }

        if (!data.activities || !data.activities.length) {
            activityList.innerHTML = '<div class="empty">Nu există activități recente.</div>';
            return;
        }

        data.activities.forEach(activity => {
            const iconClass = activity.type === 'add' ? 'bg-blue' :
                activity.type === 'update' ? 'bg-green' :
                activity.type === 'user' ? 'bg-orange' : 'bg-purple';

            let timeText = '';
            if (activity.time) {
                const date = new Date(activity.time);
                timeText = date.toLocaleString('ro-RO', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });
            }

            const activityItem = document.createElement('div');
            activityItem.className = 'activity-item';
            activityItem.innerHTML = `
                <div class="activity-icon ${iconClass}">
                    <i class="${activity.icon}"></i>
                </div>
                <div class="activity-details">
                    <h4>${activity.title}</h4>
                    <p>${activity.description}</p>
                    <span class="activity-time">${timeText}</span>
                </div>
            `;
            activityList.appendChild(activityItem);
        });
    } catch (error) {
        activityList.innerHTML = '<div class="error">Eroare la încărcarea activităților recente.</div>';
    }
}

async function loadProducts(page = 1) {
    productsCurrentPage = page;

    try {
        const categoryEl = document.getElementById('product-category-filter');
        const sortEl = document.getElementById('product-sort');
        const searchEl = document.getElementById('product-search');
        const category = categoryEl ? categoryEl.value : '';
        const sortValue = sortEl ? sortEl.value : '';
        const searchQuery = searchEl ? searchEl.value.trim() : '';

        let query = `?limit=${productsPerPage}&page=${page}`;
        if (category) query += `&category=${encodeURIComponent(category)}`;
        if (searchQuery.length > 0) query += `&search=${encodeURIComponent(searchQuery)}`;
        if (sortValue === 'price-asc') query += '&sort=price:asc';
        else if (sortValue === 'price-desc') query += '&sort=price:desc';
        else if (sortValue === 'name-asc') query += '&sort=name:asc';
        else query += '&sort=createdAt:desc';

        const response = await fetch(`/api/products${query}`);
        const data = await response.json();

        if (data.success) {
            const tableBody = document.querySelector('#products-table tbody');
            if (!tableBody) return;
            tableBody.innerHTML = '';

            data.products.forEach(product => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${product._id.substring(0, 8)}...</td>
                    <td>${product.image ? `<img src="${product.image}" alt="${product.name}" style="width:40px;height:40px;object-fit:cover;border-radius:5px;">` : '<i class="fas fa-image" style="color:#aaa;font-size:1.5rem;"></i>'}</td>
                    <td>${product.name}</td>
                    <td>${product.category || '-'}</td>
                    <td>${product.brand || '-'}</td>
                    <td>${product.price.toFixed(2)} EUR</td>
                    <td>${new Date(product.createdAt).toLocaleDateString('ro-RO')}</td>
                    <td>
                        <div class="table-actions">
                            <button class="action-btn edit" onclick="editProduct('${product._id}')">✏️</button>
                            <button class="action-btn delete" onclick="confirmDelete('product', '${product._id}')">🗑️</button>
                        </div>
                    </td>
                `;
                tableBody.appendChild(row);
            });

            productsTotalPages = data.totalPages  || 1;
            renderProductsPagination();
        } else {
            console.error('Eroare la încărcarea produselor:', data.message);
        }
    } catch (error) {
        console.error('Eroare la încărcarea produselor:', error);
    }
}

function renderProductsPagination() {
    const pagination = document.getElementById('products-pagination');
    if (!pagination) return;

    pagination.innerHTML = '';

    const prevBtn = document.createElement('button');
    prevBtn.className = 'btn-page prev';
    prevBtn.disabled = productsCurrentPage === 1;
    prevBtn.innerHTML = '⬅️';
    prevBtn.onclick = () => {
        if (productsCurrentPage > 1) loadProducts(productsCurrentPage - 1);
    };
    pagination.appendChild(prevBtn);

    let startPage = Math.max(1, productsCurrentPage - 2);
    let endPage = Math.min(productsTotalPages, productsCurrentPage + 2);

    if (startPage > 1) {
        pagination.appendChild(createPageBtn(1));
        if (startPage > 2) pagination.appendChild(createDots());
    }

    for (let i = startPage; i <= endPage; i++) {
        pagination.appendChild(createPageBtn(i));
    }

    if (endPage < productsTotalPages) {
        if (endPage < productsTotalPages - 1) pagination.appendChild(createDots());
        pagination.appendChild(createPageBtn(productsTotalPages));
    }

    const nextBtn = document.createElement('button');
    nextBtn.className = 'btn-page next';
    nextBtn.disabled = productsCurrentPage === productsTotalPages;
    nextBtn.innerHTML = '➡️';
    nextBtn.onclick = () => {
        if (productsCurrentPage < productsTotalPages) loadProducts(productsCurrentPage + 1);
    };
    pagination.appendChild(nextBtn);

    function createPageBtn(pageNum) {
        const btn = document.createElement('span');
        btn.className = 'page-number' + (pageNum === productsCurrentPage ? ' active' : '');
        btn.textContent = pageNum;
        if (pageNum !== productsCurrentPage) {
            btn.style.cursor = 'pointer';
            btn.onclick = () => loadProducts(pageNum);
        }
        return btn;
    }
    function createDots() {
        const span = document.createElement('span');
        span.className = 'dots';
        span.textContent = '...';
        return span;
    }
}

async function loadNews(page = 1) {
    newsCurrentPage = page;
    const tableBody = document.getElementById('news-table').querySelector('tbody');
    const pagination = document.getElementById('news-pagination');
    const token = localStorage.getItem('authToken');

    try {
        const res = await fetch(`/api/news?page=${page}&limit=${newsPerPage}`, {
            headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });
        const data = await res.json();

        if (data.success) {
            newsCurrentPage = data.page;
            newsTotalPages = data.totalPages;

            tableBody.innerHTML = '';
            data.news.forEach(article => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${article._id ? article._id.substring(0, 8) + '...' : '-'}</td>
                    <td>
                        ${article.imageUrl
                            ? `<img src="${article.imageUrl}" alt="image" style="width:40px;height:40px;object-fit:cover;border-radius:4px;" onerror="this.style.display='none'">`
                            : '<i class="fas fa-image" style="color:#aaa;font-size:1.5rem;"></i>'}
                    </td>
                    <td><a href="${article.url}" target="_blank" rel="noopener noreferrer">${article.title}</a></td>
                    <td>${article.sourceName || '-'}</td>
                    <td>${article.author || '—'}</td>
                    <td>${article.publishDate ? new Date(article.publishDate).toLocaleDateString('ro-RO') : '-'}</td>
                    <td>
                        <div class="table-actions">
                            <button class="action-btn delete" data-id="${article._id}" title="Șterge știrea">🗑️</button>
                        </div>
                    </td>
                `;
                tableBody.appendChild(tr);
            });

            activateNewsActionButtons();
            renderNewsPagination();
        } else {
            tableBody.innerHTML = '<tr><td colspan="7">Nu s-au putut încărca știrile.</td></tr>';
        }
    } catch (err) {
        console.error('Eroare la fetch știri:', err);
        tableBody.innerHTML = '<tr><td colspan="7">Eroare server.</td></tr>';
    }
}


function activateNewsActionButtons() {
    const token = localStorage.getItem('authToken');
    document.querySelectorAll('.action-btn.delete[data-id]').forEach(button => {
        button.onclick = async () => {
            const newsId = button.getAttribute('data-id');
            if (!confirm('Ești sigur că vrei să ștergi această știre?')) return;
            try {
                const res = await fetch(`/api/news/${newsId}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const result = await res.json();
                if (result.success) {
                    loadNews(newsCurrentPage);
                } else {
                    alert(result.message || 'Eroare la ștergere.');
                }
            } catch (err) {
                console.error('Eroare la ștergere știre:', err);
                alert('Eroare la conexiune cu serverul.');
            }
        };
    });
}

function renderNewsPagination() {
    const pagination = document.getElementById('news-pagination');
    if (!pagination) return;

    pagination.innerHTML = '';

    const prevBtn = document.createElement('button');
    prevBtn.className = 'btn-page prev';
    prevBtn.disabled = newsCurrentPage === 1;
    prevBtn.innerHTML = '⬅️';
    prevBtn.onclick = () => {
        if (newsCurrentPage > 1) loadNews(newsCurrentPage - 1);
    };
    pagination.appendChild(prevBtn);

    let startPage = Math.max(1, newsCurrentPage - 2);
    let endPage = Math.min(newsTotalPages, newsCurrentPage + 2);

    if (startPage > 1) {
        pagination.appendChild(createPageBtn(1));
        if (startPage > 2) pagination.appendChild(createDots());
    }
    for (let i = startPage; i <= endPage; i++) {
        pagination.appendChild(createPageBtn(i));
    }
    if (endPage < newsTotalPages) {
        if (endPage < newsTotalPages - 1) pagination.appendChild(createDots());
        pagination.appendChild(createPageBtn(newsTotalPages));
    }

    const nextBtn = document.createElement('button');
    nextBtn.className = 'btn-page next';
    nextBtn.disabled = newsCurrentPage === newsTotalPages;
    nextBtn.innerHTML = '➡️';
    nextBtn.onclick = () => {
        if (newsCurrentPage < newsTotalPages) loadNews(newsCurrentPage + 1);
    };
    pagination.appendChild(nextBtn);

    function createPageBtn(pageNum) {
        const btn = document.createElement('span');
        btn.className = 'page-number' + (pageNum === newsCurrentPage ? ' active' : '');
        btn.textContent = pageNum;
        if (pageNum !== newsCurrentPage) {
            btn.style.cursor = 'pointer';
            btn.onclick = () => loadNews(pageNum);
        }
        return btn;
    }
    function createDots() {
        const span = document.createElement('span');
        span.className = 'dots';
        span.textContent = '...';
        return span;
    }
}

async function loadUsers(page = 1) {
    usersCurrentPage = page;
    const tableBody = document.getElementById('users-table').querySelector('tbody');
    const token = localStorage.getItem('authToken');

    try {
        const response = await fetch(`/api/users?page=${page}&limit=${usersPerPage}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();

        if (data.success) {
            usersCurrentPage = data.page;
            usersTotalPages = data.totalPages;

            tableBody.innerHTML = '';
            data.users.forEach(user => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${user._id ? user._id.substring(0, 8) + '...' : '-'}</td>
                    <td>${user.username}</td>
                    <td>${user.email || '—'}</td>
                    <td>${user.role}</td>
                    <td>${user.createdAt ? new Date(user.createdAt).toLocaleDateString('ro-RO') : '-'}</td>
                    <td>
                        <div class="table-actions">
                            <button class="action-btn delete" onclick="confirmDelete('user', '${user._id}')" title="Șterge utilizatorul">🗑️</button>
                        </div>
                    </td>
                `;
                tableBody.appendChild(tr);
            });

            renderUsersPagination();
        } else {
            tableBody.innerHTML = '<tr><td colspan="6">Nu s-au putut încărca utilizatorii.</td></tr>';
        }
    } catch (err) {
        console.error('Eroare la fetch utilizatori:', err);
        tableBody.innerHTML = '<tr><td colspan="6">Eroare server.</td></tr>';
    }
}

function renderUsersPagination() {
    const pagination = document.getElementById('users-pagination');
    if (!pagination) return;

    pagination.innerHTML = '';

    const prevBtn = document.createElement('button');
    prevBtn.className = 'btn-page prev';
    prevBtn.disabled = usersCurrentPage === 1;
    prevBtn.innerHTML = '⬅️';
    prevBtn.onclick = () => {
        if (usersCurrentPage > 1) loadUsers(usersCurrentPage - 1);
    };
    pagination.appendChild(prevBtn);

    let startPage = Math.max(1, usersCurrentPage - 2);
    let endPage = Math.min(usersTotalPages, usersCurrentPage + 2);

    if (startPage > 1) {
        pagination.appendChild(createPageBtn(1));
        if (startPage > 2) pagination.appendChild(createDots());
    }
    for (let i = startPage; i <= endPage; i++) {
        pagination.appendChild(createPageBtn(i));
    }
    if (endPage < usersTotalPages) {
        if (endPage < usersTotalPages - 1) pagination.appendChild(createDots());
        pagination.appendChild(createPageBtn(usersTotalPages));
    }

    const nextBtn = document.createElement('button');
    nextBtn.className = 'btn-page next';
    nextBtn.disabled = usersCurrentPage === usersTotalPages;
    nextBtn.innerHTML = '➡️';
    nextBtn.onclick = () => {
        if (usersCurrentPage < usersTotalPages) loadUsers(usersCurrentPage + 1);
    };
    pagination.appendChild(nextBtn);

    function createPageBtn(pageNum) {
        const btn = document.createElement('span');
        btn.className = 'page-number' + (pageNum === usersCurrentPage ? ' active' : '');
        btn.textContent = pageNum;
        if (pageNum !== usersCurrentPage) {
            btn.style.cursor = 'pointer';
            btn.onclick = () => loadUsers(pageNum);
        }
        return btn;
    }
    function createDots() {
        const span = document.createElement('span');
        span.className = 'dots';
        span.textContent = '...';
        return span;
    }
}

async function loadSources(page = 1) {
    sourcesCurrentPage = page;

    try {
        const typeEl = document.getElementById('source-type-filter');
        const statusEl = document.getElementById('source-status-filter');
        const searchEl = document.getElementById('source-search');
        const type = typeEl ? typeEl.value : '';
        const status = statusEl ? statusEl.value : '';
        const searchQuery = searchEl ? searchEl.value : '';

        let query = `?limit=${sourcesPerPage}&page=${page}`;
        if (type) query += `&type=${type}`;
        if (status) query += `&active=${status === 'active'}`;

        const response = await fetch(`/api/sources${query}`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
        });
        const data = await response.json();

        if (data.success) {
            const tableBody = document.querySelector('#sources-table tbody');
            if (!tableBody) return;
            tableBody.innerHTML = '';

            data.sources.forEach(source => {
                if (searchQuery && !source.name.toLowerCase().includes(searchQuery.toLowerCase())) return;
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${source._id.substring(0, 8)}...</td>
                    <td>${source.name}</td>
                    <td>${source.type}</td>
                    <td>${source.url.substring(0, 30)}${source.url.length > 30 ? '...' : ''}</td>
                    <td><span class="status ${source.active ? 'status-active' : 'status-inactive'}">${source.active ? 'Activ' : 'Inactiv'}</span></td>
                    <td>${source.lastUpdated ? new Date(source.lastUpdated).toLocaleDateString('ro-RO', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Niciodată'}</td>
                    <td>
                        <div class="table-actions">
                            <!-- Buton editare -->
                            <button class="action-btn edit" onclick="editSource('${source._id}')" title="Editează sursa">
                                ✏️
                            </button>
                            <!-- Buton ștergere -->
                            <button class="action-btn delete" onclick="confirmDelete('source', '${source._id}')" title="Șterge sursa">
                                🗑️
                            </button>
                            <!-- Buton activare/dezactivare (opțional) -->
                            <button class="action-btn ${source.active ? 'pause' : 'play'}" onclick="toggleSourceStatus('${source._id}', ${!source.active})" title="${source.active ? 'Dezactivează' : 'Activează'} sursa">
                                ${source.active ? '⏸️' : '▶️'}
                            </button>
                        </div>
                    </td>

                `;
                tableBody.appendChild(row);
            });

            sourcesTotalPages = data.totalPages || 1;
            renderSourcesPagination();
        } else {
            console.error('Eroare la încărcarea surselor:', data.message);
        }
    } catch (error) {
        console.error('Eroare la încărcarea surselor:', error);
    }
}

function renderSourcesPagination() {
    const pagination = document.getElementById('sources-pagination');
    if (!pagination) return;

    pagination.innerHTML = '';

    const prevBtn = document.createElement('button');
    prevBtn.className = 'btn-page prev';
    prevBtn.disabled = sourcesCurrentPage === 1;
    prevBtn.innerHTML = '⬅️';
    prevBtn.onclick = () => {
        if (sourcesCurrentPage > 1) loadSources(sourcesCurrentPage - 1);
    };
    pagination.appendChild(prevBtn);

    let startPage = Math.max(1, sourcesCurrentPage - 2);
    let endPage = Math.min(sourcesTotalPages, sourcesCurrentPage + 2);

    if (startPage > 1) {
        pagination.appendChild(createPageBtn(1));
        if (startPage > 2) pagination.appendChild(createDots());
    }

    for (let i = startPage; i <= endPage; i++) {
        pagination.appendChild(createPageBtn(i));
    }

    if (endPage < sourcesTotalPages) {
        if (endPage < sourcesTotalPages - 1) pagination.appendChild(createDots());
        pagination.appendChild(createPageBtn(sourcesTotalPages));
    }

    const nextBtn = document.createElement('button');
    nextBtn.className = 'btn-page next';
    nextBtn.disabled = sourcesCurrentPage === sourcesTotalPages;
    nextBtn.innerHTML = '➡️';
    nextBtn.onclick = () => {
        if (sourcesCurrentPage < sourcesTotalPages) loadSources(sourcesCurrentPage + 1);
    };
    pagination.appendChild(nextBtn);

    function createPageBtn(pageNum) {
        const btn = document.createElement('span');
        btn.className = 'page-number' + (pageNum === sourcesCurrentPage ? ' active' : '');
        btn.textContent = pageNum;
        if (pageNum !== sourcesCurrentPage) {
            btn.style.cursor = 'pointer';
            btn.onclick = () => loadSources(pageNum);
        }
        return btn;
    }
    function createDots() {
        const span = document.createElement('span');
        span.className = 'dots';
        span.textContent = '...';
        return span;
    }
}

window.editProduct = async function (productId) {
    try {
        const response = await fetch(`/api/products/${productId}`);
        const data = await response.json();
        if (data.success && data.product) {
            const product = data.product;
            const titleEl = document.getElementById('product-modal-title');
            if (titleEl) titleEl.textContent = 'Editare produs';
            const fields = {
                'product-name': product.name,
                'product-brand': product.brand || '',
                'product-model': product.model || '',
                'product-category': product.category || '',
                'product-price': product.price || '',
                'product-currency': product.currency || '',
                'product-color': product.color || '',
                'product-autonomy': product.autonomy || '',
                'product-asin': product.asin || '',
                'product-url': product.url || '',
                'product-image': product.image || '',
                'product-description': product.description || '',
                'product-id': productId,
                'product-features': (product.features || []).join('\n')
            };
            for (const [id, value] of Object.entries(fields)) {
                const el = document.getElementById(id);
                if (el) el.value = value;
            }
            const inStockEl = document.getElementById('product-instock');
            if (inStockEl) inStockEl.checked = !!product.inStock;
            openModal('product-modal');
        } else {
            alert('Eroare la încărcarea datelor produsului');
        }
    } catch (error) {
        console.error('Eroare la editarea produsului:', error);
        alert('A apărut o eroare la încărcarea datelor produsului');
    }
};

window.editSource = async function (sourceId) {
    try {
        const response = await fetch(`/api/sources/${sourceId}`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
        });
        const data = await response.json();
        if (data.success && data.source) {
            const source = data.source;
            document.getElementById('source-modal-title').textContent = 'Editare sursă';
            document.getElementById('source-name').value = source.name;
            document.getElementById('source-type').value = source.type;
            document.getElementById('source-url').value = decodeHTMLEntities(source.url);
            document.getElementById('source-description').value = source.description || '';
            document.getElementById('source-update-freq').value = source.updateFrequency || 60;
            document.getElementById('source-active').value = source.active ? 'true' : 'false';
            document.getElementById('source-id').value = sourceId;
            openModal('source-modal');
        } else {
            alert('Eroare la încărcarea datelor sursei');
        }
    } catch (error) {
        console.error('Eroare la editarea sursei:', error);
        alert('A apărut o eroare la încărcarea datelor sursei');
    }
};

window.confirmDelete = function (itemType, itemId) {
    const confirmMessage = document.getElementById('confirm-message');
    const confirmActionBtn = document.getElementById('confirm-action');
    if (itemType === 'product') {
        if (confirmMessage) confirmMessage.textContent = 'Ești sigur că vrei să ștergi acest produs? Această acțiune nu poate fi anulată.';
        if (confirmActionBtn) confirmActionBtn.textContent = 'Șterge produs';
    } else if (itemType === 'source') {
        if (confirmMessage) confirmMessage.textContent = 'Ești sigur că vrei să ștergi această sursă? Această acțiune nu poate fi anulată.';
        if (confirmActionBtn) confirmActionBtn.textContent = 'Șterge sursă';
    }
    if (confirmActionBtn) {
        confirmActionBtn.setAttribute('data-id', itemId);
        confirmActionBtn.setAttribute('data-type', itemType);
    }
    openModal('confirm-modal');
};

window.toggleSourceStatus = async function (sourceId, active) {
    try {
        const response = await fetch(`/api/sources/${sourceId}/toggle-active`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            },
            body: JSON.stringify({ active })
        });
        const data = await response.json();
        if (data.success) {
            loadSources();
            alert(`Sursa a fost ${active ? 'activată' : 'dezactivată'} cu succes!`);
        } else {
            alert(`Eroare: ${data.message}`);
        }
    } catch (error) {
        console.error('Eroare la actualizarea statusului sursei:', error);
        alert('A apărut o eroare la actualizarea statusului sursei');
    }
};

async function deleteItem(itemType, itemId) {
    try {
        let endpoint;
        if (itemType === 'product') {
            endpoint = `/api/products/${itemId}`;
        } else if (itemType === 'source') {
            endpoint = `/api/sources/${itemId}`;
        } else if (itemType === 'user') {
            endpoint = `/api/users/${itemId}`;
        } else {
            throw new Error('Tip de element invalid');
        }
        const response = await fetch(endpoint, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
        });
        const data = await response.json();
        if (data.success) {
            closeModal('confirm-modal');
            if (itemType === 'product') loadProducts();
            else if (itemType === 'source') loadSources();
            alert(itemType === 'product' ? 'Produs șters cu succes!' : 'Sursă ștearsă cu succes!');
        } else {
            alert(`Eroare: ${data.message}`);
        }
    } catch (error) {
        console.error('Eroare la ștergerea elementului:', error);
        alert('A apărut o eroare la ștergerea elementului');
    }
}

function logout() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    window.location.href = '/login';
}

function attachFilters() {
    const productCategoryFilter = document.getElementById('product-category-filter');
    if (productCategoryFilter) productCategoryFilter.addEventListener('change', () => loadProducts(1));
    const productSort = document.getElementById('product-sort');
    if (productSort) productSort.addEventListener('change', () => loadProducts(1));
    const productSearch = document.getElementById('product-search');
    if (productSearch) productSearch.addEventListener('input', debounce(() => loadProducts(1), 300));

    const sourceTypeFilter = document.getElementById('source-type-filter');
    if (sourceTypeFilter) sourceTypeFilter.addEventListener('change', () => loadSources(1));
    const sourceStatusFilter = document.getElementById('source-status-filter');
    if (sourceStatusFilter) sourceStatusFilter.addEventListener('change', () => loadSources(1));
    const sourceSearch = document.getElementById('source-search');
    if (sourceSearch) sourceSearch.addEventListener('input', debounce(() => loadSources(1), 300));
}


function decodeHTMLEntities(text) {
    const textarea = document.createElement('textarea');
    textarea.innerHTML = text;
    return textarea.value;
}

function debounce(func, wait) {
    let timeout;
    return function () {
        const context = this;
        const args = arguments;
        clearTimeout(timeout);
        timeout = setTimeout(() => {
            func.apply(context, args);
        }, wait);
    };
}

