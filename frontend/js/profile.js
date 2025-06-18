document.addEventListener('DOMContentLoaded', function () {
    const token = localStorage.getItem('authToken');
    const logoutBtn = document.getElementById('logout-btn');

    // ✅ Redirect imediat dacă tokenul nu există
    if (!token) {
        window.location.href = '/login';
        return;
    }

    // ✅ Cerere profil
    fetch('/api/profile', {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
    .then(response => {
        if (response.status === 401) {
            window.location.href = '/login';
            throw new Error('Neautentificat');
        }
        return response.json();
    })
    .then(data => {
        if (!data.success || !data.user) {
            window.location.href = '/login';
            return;
        }

        // ✅ Elemente din DOM
        const usernameEl = document.getElementById('profile-username');
        const roleEl = document.getElementById('profile-role');
        const infoEl = document.getElementById('profile-info');
        const avatarEl = document.getElementById('profile-avatar');
        const prefDiv = document.getElementById('preferences-display');

        if (usernameEl) usernameEl.textContent = data.user.username;
        if (roleEl) roleEl.textContent = data.user.role === 'admin' ? 'Administrator' : 'Membru';

        // ✅ Info profil
        let html = '';
        if (data.user.email) {
            html += `<p><b>Email:</b> ${data.user.email}</p>`;
        }

        const createdAt = data.user.createdAt ? new Date(data.user.createdAt) : null;
        const createdAtStr = createdAt && !isNaN(createdAt) ? createdAt.toLocaleDateString() : 'N/A';
        html += `<p><b>Data înregistrare:</b> ${createdAtStr}</p>`;

        if (data.user.lastLogin) {
            const lastLogin = new Date(data.user.lastLogin);
            html += `<p><b>Ultima autentificare:</b> ${!isNaN(lastLogin) ? lastLogin.toLocaleString() : 'N/A'}</p>`;
        }

        if (infoEl) infoEl.innerHTML = html;

        // ✅ Avatar
        if (avatarEl) {
            if (data.user.avatar) {
                avatarEl.innerHTML = `<img src="${data.user.avatar}" alt="Avatar" onerror="this.onerror=null;this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(data.user.username)}';">`;
            } else {
                avatarEl.innerHTML = `<i class="fas fa-user-circle"></i>`;
            }
        }

        // ✅ Preferințe
        if (prefDiv && data.user.preferences) {
            const prefs = data.user.preferences;
            let prefHtml = '';

            if (prefs.categories?.length)
                prefHtml += `<p><b>Categorii:</b> ${prefs.categories.join(', ')}</p>`;
            if (prefs.brands?.length)
                prefHtml += `<p><b>Branduri:</b> ${prefs.brands.join(', ')}</p>`;
            if (prefs.color)
                prefHtml += `<p><b>Culoare preferată:</b> ${prefs.color}</p>`;
            if (prefs.autonomy)
                prefHtml += `<p><b>Autonomie preferată:</b> ${prefs.autonomy}</p>`;
            if (prefs.priceRange) {
                prefHtml += `<p><b>Preț preferat:</b> ${
                    prefs.priceRange === 'low' ? '&lt; 1000 lei' :
                    prefs.priceRange === 'mid' ? '1000–3000 lei' :
                    prefs.priceRange === 'high' ? '&gt; 3000 lei' : ''
                }</p>`;
            }
            if (prefs.inStock)
                prefHtml += `<p><b>Doar produse în stoc:</b> Da</p>`;

            if (!prefHtml)
                prefHtml = `<p>(Nu ai salvat nicio preferință personalizată.)</p>`;

            prefDiv.innerHTML = prefHtml;
        }
    })
    .catch(() => {
        if (!window.location.pathname.includes('/login')) {
            window.location.href = '/login';
        }
    });

    // ✅ Formular avatar
    const avatarForm = document.getElementById('avatar-form');
    if (avatarForm) {
        avatarForm.addEventListener('submit', function (e) {
            e.preventDefault();
            const url = document.getElementById('avatar-url').value;
            const msg = document.getElementById('avatar-message');

            if (!/^https?:\/\/.+\.(jpg|jpeg|png|gif)$/i.test(url)) {
                msg.textContent = "Introdu un link valid către o imagine (jpg/png/gif).";
                msg.style.color = "red";
                return;
            }

            msg.textContent = "Se trimite cererea...";
            fetch('/api/profile/avatar', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ avatar: url })
            })
            .then(r => r.json())
            .then(data => {
                msg.textContent = data.success ? "Avatar actualizat!" : (data.message || "Eroare la schimbare avatar.");
                msg.style.color = data.success ? "green" : "red";
                if (data.success) setTimeout(() => location.reload(), 700);
            })
            .catch(() => {
                msg.textContent = "Eroare la conectare cu serverul";
                msg.style.color = "red";
            });
        });
    }

    // ✅ Logout
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function () {
            localStorage.removeItem('authToken');
            window.location.href = '/login';
        });
    }

    // ✅ Formular schimbare parolă
    const form = document.getElementById('change-password-form');
    if (form) {
        form.addEventListener('submit', function (e) {
            e.preventDefault();
            const currentPassword = document.getElementById('current-password').value;
            const newPassword = document.getElementById('new-password').value;
            const msg = document.getElementById('change-password-message');

            if (newPassword.length < 6) {
                msg.textContent = "Parola nouă trebuie să aibă cel puțin 6 caractere!";
                msg.style.color = "red";
                return;
            }

            msg.textContent = "Se trimite cererea...";
            fetch('/api/profile/password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ currentPassword, newPassword })
            })
            .then(r => r.json())
            .then(data => {
                msg.textContent = data.success ? "Parola a fost schimbată cu succes!" : (data.message || "Eroare la schimbarea parolei.");
                msg.style.color = data.success ? "green" : "red";
                if (data.success) form.reset();
            })
            .catch(() => {
                msg.textContent = "Eroare la conectare cu serverul";
                msg.style.color = "red";
            });
        });
    }
});
