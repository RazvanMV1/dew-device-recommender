document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('adminCreateUserForm');
    const alertBox = document.getElementById('userFormAlert');
    const tableBody = document.getElementById('userTableBody');
    const token = localStorage.getItem('authToken');

    // Încarcă lista de utilizatori
    function loadUsers() {
        fetch('/api/users', {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    tableBody.innerHTML = '';
                    data.users.forEach(user => {
                        const tr = document.createElement('tr');
                        tr.innerHTML = `
                            <td>
                                <button class="btn-delete" data-id="${user._id}" title="Șterge utilizatorul">
                                  🗑️
                                </button>
                              </td>
                            <td>${user.username}</td>
                            <td>${user.email || '—'}</td>
                            <td>${user.role}</td>
                            <td>${new Date(user.createdAt).toLocaleString()}</td>
                        `;
                        tableBody.appendChild(tr);
                    });

                    // Activează butoanele de ștergere
                    document.querySelectorAll('.btn-delete').forEach(button => {
                        button.addEventListener('click', async () => {
                            const userId = button.getAttribute('data-id');
                            const username = button.closest('tr').children[1].textContent;

                            if (!confirm(`Ești sigur că vrei să ștergi utilizatorul „${username}”?`)) return;

                            try {
                                const res = await fetch(`/api/users/${userId}`, {
                                    method: 'DELETE',
                                    headers: {
                                        'Authorization': `Bearer ${token}`
                                    }
                                });

                                const result = await res.json();

                                if (result.success) {
                                    loadUsers(); // reîncarcă lista
                                } else {
                                    alert(result.message || 'Eroare la ștergere.');
                                }
                            } catch (err) {
                                console.error('Eroare la ștergere:', err);
                                alert('Eroare la conexiune cu serverul.');
                            }
                        });
                    });

                } else {
                    tableBody.innerHTML = '<tr><td colspan="5">Nu s-au putut încărca utilizatorii.</td></tr>';
                }
            })
            .catch(err => {
                console.error('Eroare la fetch utilizatori:', err);
                tableBody.innerHTML = '<tr><td colspan="5">Eroare server.</td></tr>';
            });
    }

    loadUsers(); // inițial

    // Creează utilizator nou
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
                loadUsers(); // actualizează tabelul
            }
        } catch (err) {
            console.error('Eroare:', err);
            alertBox.textContent = 'Eroare de rețea sau server.';
            alertBox.className = 'alert alert-error';
            alertBox.style.display = 'block';
        } finally {
            submitButton.disabled = false;
            submitButton.innerHTML = originalText;
        }
    });
});
