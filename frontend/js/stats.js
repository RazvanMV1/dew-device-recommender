document.addEventListener('DOMContentLoaded', () => {
  loadRssStats();
  handleUserMenu();
  setupMobileMenu();
});

// === Menține meniul responsive pe mobil ===
function setupMobileMenu() {
  const toggleBtn = document.getElementById('mobile-menu-toggle');
  const nav = document.getElementById('main-nav');
  toggleBtn?.addEventListener('click', () => {
    nav?.classList.toggle('open');
  });
}

// === Încarcă statisticile despre știri și surse RSS ===
async function loadRssStats() {
  try {
    const newsRes = await fetch('/api/news/stats');
    const newsData = await newsRes.json();

    if (newsData.success && newsData.stats) {
      document.getElementById('news-count').textContent = newsData.stats.totalNews || 0;
      document.getElementById('categories-count').textContent = newsData.stats.categories || 0;

      if (Array.isArray(newsData.stats.topCategories)) {
        renderCategoriesChart(newsData.stats.topCategories);
      }
    }

    const sourcesRes = await fetch('/api/sources?type=rss');
    const sourcesData = await sourcesRes.json();

    if (sourcesData.success && Array.isArray(sourcesData.sources)) {
      const activeSources = sourcesData.sources.filter(s => s.active);
      document.getElementById('sources-count').textContent = activeSources.length;

      const lastUpdated = activeSources.reduce((latest, s) => {
        const d = s.lastUpdated ? new Date(s.lastUpdated) : null;
        return d && d > latest ? d : latest;
      }, new Date(0));

      document.getElementById('last-updated').textContent =
        lastUpdated.getTime() > 0
          ? lastUpdated.toLocaleString('ro-RO', {
              day: 'numeric',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit'
            })
          : 'Niciodată';

      renderRssSources(activeSources);
    }

    const latestNewsRes = await fetch('/api/news/latest/6');
    const latestNewsData = await latestNewsRes.json();

    if (latestNewsData.success && Array.isArray(latestNewsData.news)) {
      renderLatestNews(latestNewsData.news);
    }
  } catch (err) {
    console.error('Eroare la încărcarea statisticilor RSS:', err);
  }
}

// === Populează meniul utilizatorului ===
function handleUserMenu() {
  const token = localStorage.getItem('authToken');
  const nameSpan = document.querySelector('.user-name');
  const dropdownName = document.getElementById('dropdown-user-name');
  const dropdownRole = document.getElementById('dropdown-user-role');

  if (!token) return;

  fetch('/api/profile', {
    headers: {
      Authorization: `Bearer ${token}`
    }
  })
    .then(res => res.json())
    .then(data => {
      if (data.success && data.user) {
        const username = data.user.username;
        const role = data.user.role;

        if (nameSpan) nameSpan.textContent = username;
        if (dropdownName) dropdownName.textContent = username;
        if (dropdownRole) dropdownRole.textContent = role === 'admin' ? 'Administrator' : 'Membru';

        document.getElementById('auth-link')?.style.setProperty('display', 'none');
        document.getElementById('register-link')?.style.setProperty('display', 'none');
        document.getElementById('profile-link')?.style.setProperty('display', 'flex');
        document.getElementById('preferences-link')?.style.setProperty('display', 'flex');
        document.getElementById('logout-link')?.style.setProperty('display', 'flex');
      }
    })
    .catch(err => console.error('Eroare la profil:', err));

  document.getElementById('logout-link')?.addEventListener('click', e => {
    e.preventDefault();
    localStorage.removeItem('authToken');
    window.location.href = '/login';
  });
}

// === Render Știri Recente ===
function renderLatestNews(news) {
  const container = document.getElementById('latest-news');
  if (!news || news.length === 0) {
    container.innerHTML = `
      <div class="no-data-message">
        <i class="fas fa-newspaper"></i>
        <p>Nu există știri disponibile.</p>
      </div>`;
    return;
  }

  container.innerHTML = '';
  news.forEach(item => {
    const card = document.createElement('div');
    card.className = 'news-card';

    const date = new Date(item.publishDate).toLocaleDateString('ro-RO', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });

    card.innerHTML = `
      <div class="news-image">
        <img src="${item.imageUrl || 'https://via.placeholder.com/300x180?text=No+Image'}" alt="${item.title}">
      </div>
      <div class="news-content">
        <div class="news-date">${date}</div>
        <h4 class="news-title">${item.title}</h4>
        <p class="news-excerpt">${item.description?.substring(0, 100) || 'Nu există descriere'}...</p>
        <a href="${item.url}" target="_blank" class="read-more">Citește mai mult <i class="fas fa-arrow-right"></i></a>
      </div>`;

    container.appendChild(card);
  });
}

// === Render Surse RSS ===
function renderRssSources(sources) {
  const container = document.getElementById('rss-sources');
  if (!sources || sources.length === 0) {
    container.innerHTML = `
      <div class="no-data-message">
        <i class="fas fa-rss"></i>
        <p>Nu există surse RSS active.</p>
      </div>`;
    return;
  }

  container.innerHTML = '';
  sources.forEach(source => {
    const updated = source.lastUpdated
      ? new Date(source.lastUpdated).toLocaleDateString('ro-RO', {
          day: 'numeric',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit'
        })
      : 'Niciodată';

    const item = document.createElement('div');
    item.className = 'rss-source-item';
    item.innerHTML = `
      <div class="rss-source-icon"><i class="fas fa-rss"></i></div>
      <div class="rss-source-content">
        <h4>${source.name}</h4>
        <p class="source-url"><a href="${source.url}" target="_blank">${source.url}</a></p>
        <p class="source-update">Ultima actualizare: ${updated}</p>
      </div>`;

    container.appendChild(item);
  });
}

// === Render Chart Categorii ===
function renderCategoriesChart(categories) {
  const ctx = document.getElementById('categories-chart').getContext('2d');
  const labels = categories.map(cat => cat._id || 'Necunoscut');
  const data = categories.map(cat => cat.count);
  const backgroundColors = generateColors(categories.length);

  new Chart(ctx, {
    type: 'pie',
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: backgroundColors,
        borderColor: 'white',
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: 'right' },
        tooltip: {
          callbacks: {
            label: function (tooltipItem) {
              const dataset = tooltipItem.dataset;
              const total = dataset.data.reduce((sum, val) => sum + val, 0);
              const value = dataset.data[tooltipItem.dataIndex];
              const percent = Math.round((value / total) * 100);
              return `${tooltipItem.label}: ${value} (${percent}%)`;
            }
          }
        }
      }
    }
  });
}

// === Culori pentru chart ===
function generateColors(count) {
  const base = [
    '#4e79a7', '#f28e2b', '#e15759', '#76b7b2',
    '#59a14f', '#edc948', '#b07aa1', '#ff9da7',
    '#9c755f', '#bab0ac'
  ];

  const colors = [...base];
  while (colors.length < count) {
    const r = Math.floor(Math.random() * 200);
    const g = Math.floor(Math.random() * 200);
    const b = Math.floor(Math.random() * 200);
    colors.push(`rgba(${r},${g},${b},0.7)`);
  }

  return colors.slice(0, count);
}
