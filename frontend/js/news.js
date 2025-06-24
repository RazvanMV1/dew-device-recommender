document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('news-list');
    const paginationContainer = document.getElementById('pagination');
    const limit = 6;
    const API_BASE_URL = window.API_BASE_URL || "http://localhost:3004";

    document.getElementById('logout-btn')?.addEventListener('click', () => {
        localStorage.removeItem('authToken');
        window.location.href = '/login';
    });

    function fetchNews(page = 1) {
        fetch(`${API_BASE_URL}/api/news?page=${page}&limit=${limit}`)
            .then(res => res.json())
            .then(data => {
                container.innerHTML = '';
                if (!Array.isArray(data.news) || data.news.length === 0) {
                    container.innerHTML = "<p>Nu există știri disponibile momentan.</p>";
                    paginationContainer.innerHTML = '';
                    return;
                }

                data.news.forEach(item => {
                    const date = new Date(item.publishDate || item.createdAt).toLocaleDateString('ro-RO', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                    });

                    const card = document.createElement('div');
                    card.className = 'news-card';
                    card.innerHTML = `
                        <div class="news-image">
                            <img src="${item.imageUrl || 'https://via.placeholder.com/300x180?text=No+Image'}" alt="${item.title}">
                        </div>
                        <div class="news-content">
                            <div class="news-date">${date}</div>
                            <h4 class="news-title">${item.title}</h4>
                            <p class="news-excerpt">${(item.description || 'Fără descriere').substring(0, 120)}...</p>
                            <a href="${item.url}" target="_blank" class="read-more">
                                Citește mai mult <i class="fas fa-arrow-right"></i>
                            </a>
                        </div>
                    `;
                    container.appendChild(card);
                });

                renderPagination(data.page, data.totalPages);
            })
            .catch(err => {
                console.error('Eroare la încărcarea știrilor:', err);
                container.innerHTML = "<p>Eroare la conectare cu serverul.</p>";
                paginationContainer.innerHTML = '';
            });
    }

    function renderPagination(currentPage, totalPages) {
        paginationContainer.innerHTML = '';

        const createBtn = (label, page, isActive = false) => {
            const btn = document.createElement('button');
            btn.textContent = label;
            btn.className = 'page-btn' + (isActive ? ' active' : '');
            btn.addEventListener('click', () => fetchNews(page));
            paginationContainer.appendChild(btn);
        };

        const addDots = () => {
            const dots = document.createElement('span');
            dots.textContent = '...';
            dots.className = 'dots';
            paginationContainer.appendChild(dots);
        };

        const range = 2;

        if (currentPage > 1) createBtn('«', currentPage - 1);

        if (currentPage > range + 2) {
            createBtn(1, 1);
            addDots();
        }

        for (let i = Math.max(1, currentPage - range); i <= Math.min(totalPages, currentPage + range); i++) {
            createBtn(i, i, i === currentPage);
        }

        if (currentPage < totalPages - range - 1) {
            addDots();
            createBtn(totalPages, totalPages);
        }

        if (currentPage < totalPages) createBtn('»', currentPage + 1);
    }

    fetchNews(1);
});
