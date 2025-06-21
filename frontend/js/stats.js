document.getElementById('mobile-menu-toggle')?.addEventListener('click', () => {
  document.getElementById('main-nav')?.classList.toggle('open');
});
document.querySelectorAll('#main-nav a').forEach(link => {
  link.addEventListener('click', () => {
    document.getElementById('main-nav').classList.remove('open');
  });
});

document.getElementById('logout-btn')?.addEventListener('click', () => {
  localStorage.removeItem('authToken');
  window.location.href = '/login';
});

fetch('/api/products/stats')
  .then(res => res.json())
  .then(data => {
    if (!data.success) {
      document.body.innerHTML += "<p style='color:red;'>Eroare la încărcarea statisticilor!</p>";
      return;
    }
    const tpLabels = (data.topProducts || []).map(p => p.name);
    const tpData = (data.topProducts || []).map(p => p.reviewsCount || 0);
    new Chart(document.getElementById('topProductsChart'), {
      type: 'bar',
      data: {
        labels: tpLabels,
        datasets: [{
          label: 'Număr recenzii',
          data: tpData,
          backgroundColor: 'rgba(54, 162, 235, 0.5)'
        }]
      },
      options: {
        responsive: true,
        plugins: {
          title: { display: true, text: 'Top 5 produse după recenzii' }
        },
        scales: {
          x: {
            ticks: {
              maxRotation: 45,
              minRotation: 45,
              callback: function(value) {
                const label = this.getLabelForValue(value);
                return label.length > 25 ? label.slice(0, 25) + '...' : label;
              }
            }
          }
        }
      }
    });

    const catLabels = (data.categories || []).map(c => c._id || "Necunoscut");
    const catData = (data.categories || []).map(c => c.count);
    new Chart(document.getElementById('categoriesChart'), {
      type: 'pie',
      data: {
        labels: catLabels,
        datasets: [{
          data: catData,
          backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40']
        }]
      },
      options: {
        responsive: true,
        plugins: {
          title: { display: true, text: 'Distribuție pe categorii' }
        }
      }
    });

    const colorLabels = (data.colors || []).map(c => c._id || "Necunoscut");
    const colorData = (data.colors || []).map(c => c.count);
    new Chart(document.getElementById('colorsChart'), {
      type: 'doughnut',
      data: {
        labels: colorLabels,
        datasets: [{
          data: colorData,
          backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40']
        }]
      },
      options: {
        responsive: true,
        plugins: {
          title: { display: true, text: 'Distribuție pe culori' }
        }
      }
    });
  })
  .catch(() => {
    document.body.innerHTML += "<p style='color:red;'>Eroare la conectare cu serverul!</p>";
  });
