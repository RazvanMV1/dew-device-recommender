document.addEventListener('DOMContentLoaded', () => {
  const tableBody = document.getElementById('newsTableBody');
  const pagination = document.getElementById('newsPagination');
  const token = localStorage.getItem('authToken');

  let currentPage = 1;
  let totalPages = 1;

  async function loadNews(page = 1) {
    try {
      const res = await fetch(`/api/news?page=${page}`);
      const data = await res.json();

      if (data.success) {
        currentPage = data.page;
        totalPages = data.totalPages;

        tableBody.innerHTML = '';
        data.news.forEach(article => {
          const tr = document.createElement('tr');
          tr.innerHTML = `
            <td>
              <button class="btn-delete-news" data-id="${article._id}" title="Șterge știrea">🗑️</button>
            </td>
            <td><img src="${article.imageUrl}" alt="image" style="width:60px;height:40px;object-fit:cover;border-radius:4px;" onerror="this.style.display='none'"></td>
            <td><a href="${article.url}" target="_blank">${article.title}</a></td>
            <td>${article.sourceName}</td>
            <td>${article.author || '—'}</td>
            <td>${new Date(article.publishDate).toLocaleDateString('ro-RO')}</td>
          `;
          tableBody.appendChild(tr);
        });

        activateDeleteButtons();
        renderPagination();
      } else {
        tableBody.innerHTML = '<tr><td colspan="6">Nu s-au putut încărca știrile.</td></tr>';
      }
    } catch (err) {
      console.error('Eroare la fetch știri:', err);
      tableBody.innerHTML = '<tr><td colspan="6">Eroare server.</td></tr>';
    }
  }

  function activateDeleteButtons() {
    document.querySelectorAll('.btn-delete-news').forEach(button => {
      button.addEventListener('click', async () => {
        const newsId = button.getAttribute('data-id');
        const confirmDelete = confirm('Ești sigur că vrei să ștergi această știre?');

        if (!confirmDelete) return;

        try {
          const res = await fetch(`/api/news/${newsId}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });

          const result = await res.json();

          if (result.success) {
            loadNews(currentPage);
          } else {
            alert(result.message || 'Eroare la ștergere.');
          }
        } catch (err) {
          console.error('Eroare la ștergere știre:', err);
          alert('Eroare la conexiune cu serverul.');
        }
      });
    });
  }

  function renderPagination() {
    pagination.innerHTML = '';

    const prevBtn = document.createElement('button');
    prevBtn.textContent = '⬅';
    prevBtn.disabled = currentPage === 1;
    prevBtn.onclick = () => loadNews(currentPage - 1);
    pagination.appendChild(prevBtn);

    for (let i = 1; i <= totalPages; i++) {
      const pageBtn = document.createElement('button');
      pageBtn.textContent = i;
      if (i === currentPage) pageBtn.classList.add('active');
      pageBtn.onclick = () => loadNews(i);
      pagination.appendChild(pageBtn);
    }

    const nextBtn = document.createElement('button');
    nextBtn.textContent = '➡';
    nextBtn.disabled = currentPage === totalPages;
    nextBtn.onclick = () => loadNews(currentPage + 1);
    pagination.appendChild(nextBtn);
  }

  loadNews();
});
