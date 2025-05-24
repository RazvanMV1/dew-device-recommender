// În stats.js adaugă:

// Încarcă statistici despre știrile RSS
async function loadRssStats() {
    try {
        // Obține statistici despre știri
        const newsResponse = await fetch('/api/news/stats');
        const newsData = await newsResponse.json();

        if (newsData.success) {
            document.getElementById('news-count').textContent = newsData.stats.totalNews;
            document.getElementById('categories-count').textContent = newsData.stats.categories;

            // Actualizează graficul pentru distribuția categoriilor
            if (newsData.stats.topCategories && newsData.stats.topCategories.length > 0) {
                renderCategoriesChart(newsData.stats.topCategories);
            }
        }

        // Obține statistici despre surse RSS
        const sourcesResponse = await fetch('/api/sources?type=rss');
        const sourcesData = await sourcesResponse.json();

        if (sourcesData.success) {
            document.getElementById('sources-count').textContent = sourcesData.sources.filter(s => s.active).length;

            // Actualizează ultima actualizare
            let lastUpdatedDate = new Date(0); // 1970-01-01

            sourcesData.sources.forEach(source => {
                if (source.lastUpdated) {
                    const updatedDate = new Date(source.lastUpdated);
                    if (updatedDate > lastUpdatedDate) {
                        lastUpdatedDate = updatedDate;
                    }
                }
            });

            if (lastUpdatedDate.getTime() !== 0) {
                document.getElementById('last-updated').textContent = lastUpdatedDate.toLocaleDateString('ro-RO', {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit'
                });
            } else {
                document.getElementById('last-updated').textContent = 'Niciodată';
            }

            // Afișează sursele RSS active
            renderRssSources(sourcesData.sources.filter(s => s.active));
        }

        // Încarcă cele mai recente știri
        const latestNewsResponse = await fetch('/api/news/latest/6');
        const latestNewsData = await latestNewsResponse.json();

        if (latestNewsData.success) {
            renderLatestNews(latestNewsData.news);
        }
    } catch (error) {
        console.error('Eroare la încărcarea statisticilor RSS:', error);
    }
}

// Afișează ultimele știri în pagină
function renderLatestNews(news) {
    const container = document.getElementById('latest-news');

    if (!news || news.length === 0) {
        container.innerHTML = `
            <div class="no-data-message">
                <i class="fas fa-newspaper"></i>
                <p>Nu există știri disponibile.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = '';

    news.forEach(item => {
        const newsCard = document.createElement('div');
        newsCard.className = 'news-card';

        // Formatare dată
        const publishDate = new Date(item.publishDate);
        const formattedDate = publishDate.toLocaleDateString('ro-RO', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });

        newsCard.innerHTML = `
            <div class="news-image">
                <img src="${item.imageUrl || 'https://via.placeholder.com/300x180?text=No+Image'}" alt="${item.title}">
            </div>
            <div class="news-content">
                <div class="news-date">${formattedDate}</div>
                <h4 class="news-title">${item.title}</h4>
                <p class="news-excerpt">${item.description ? item.description.substring(0, 100) + '...' : 'Nu există descriere disponibilă.'}</p>
                <a href="${item.url}" target="_blank" class="read-more">Citește mai mult <i class="fas fa-arrow-right"></i></a>
            </div>
        `;

        container.appendChild(newsCard);
    });
}

// Afișează sursele RSS active
function renderRssSources(sources) {
    const container = document.getElementById('rss-sources');

    if (!sources || sources.length === 0) {
        container.innerHTML = `
            <div class="no-data-message">
                <i class="fas fa-rss"></i>
                <p>Nu există surse RSS active.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = '';

    sources.forEach(source => {
        const sourceItem = document.createElement('div');
        sourceItem.className = 'rss-source-item';

        // Formatare ultima actualizare
        const lastUpdated = source.lastUpdated
            ? new Date(source.lastUpdated).toLocaleDateString('ro-RO', {
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit'
              })
            : 'Niciodată';

        sourceItem.innerHTML = `
            <div class="rss-source-icon">
                <i class="fas fa-rss"></i>
            </div>
            <div class="rss-source-content">
                <h4>${source.name}</h4>
                <p class="source-url"><a href="${source.url}" target="_blank">${source.url}</a></p>
                <p class="source-update">Ultima actualizare: ${lastUpdated}</p>
            </div>
        `;

        container.appendChild(sourceItem);
    });
}

// Renderează chart pentru distribuția categoriilor
function renderCategoriesChart(categories) {
    const ctx = document.getElementById('categories-chart').getContext('2d');

    // Extrage datele pentru chart
    const labels = categories.map(cat => cat._id);
    const data = categories.map(cat => cat.count);
    const backgroundColors = generateColors(categories.length);

    new Chart(ctx, {
        type: 'pie',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: backgroundColors,
                borderColor: 'white',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            legend: {
                position: 'right',
            },
            tooltips: {
                callbacks: {
                    label: function(tooltipItem, data) {
                        const dataset = data.datasets[tooltipItem.datasetIndex];
                        const total = dataset.data.reduce((acc, val) => acc + val, 0);
                        const currentValue = dataset.data[tooltipItem.index];
                        const percentage = Math.round((currentValue / total) * 100);
                        return `${data.labels[tooltipItem.index]}: ${currentValue} (${percentage}%)`;
                    }
                }
            }
        }
    });
}

// Generează culori pentru chart
function generateColors(count) {
    const baseColors = [
        '#4e79a7', '#f28e2b', '#e15759', '#76b7b2', '#59a14f',
        '#edc948', '#b07aa1', '#ff9da7', '#9c755f', '#bab0ac'
    ];

    if (count <= baseColors.length) {
        return baseColors.slice(0, count);
    }

    // Dacă avem nevoie de mai multe culori decât avem în set, generăm aleator
    const colors = [...baseColors];

    for (let i = baseColors.length; i < count; i++) {
        const r = Math.floor(Math.random() * 255);
        const g = Math.floor(Math.random() * 255);
        const b = Math.floor(Math.random() * 255);
        colors.push(`rgba(${r}, ${g}, ${b}, 0.7)`);
    }

    return colors;
}

// Adaugă încărcarea statisticilor RSS în funcția de inițializare
document.addEventListener('DOMContentLoaded', function() {
    // Codul existent...

    // Încarcă statistici RSS
    loadRssStats();
});
