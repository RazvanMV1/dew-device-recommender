// frontend/js/profile.js

document.addEventListener('DOMContentLoaded', function () {
    // Ia tokenul JWT din localStorage
    const token = localStorage.getItem('authToken');

    // Afișare profil user și avatar
    fetch('/api/profile', {
        headers: {
            'Authorization': token ? `Bearer ${token}` : ''
        }
    })
    .then(r => r.json())
    .then(data => {
        const usernameEl = document.getElementById('profile-username');
        const roleEl = document.getElementById('profile-role');
        const infoEl = document.getElementById('profile-info');
        const avatarEl = document.getElementById('profile-avatar');

        if (data.success && data.user) {
            usernameEl.textContent = data.user.username;
            roleEl.textContent = data.user.role === 'admin' ? 'Administrator' : 'Membru';
            let html = '';
            if (data.user.email) {
                html += `<p><b>Email:</b> <span>${data.user.email}</span></p>`;
            }
            // Formatăm data doar dacă e validă
            let createdAt = data.user.createdAt ? new Date(data.user.createdAt) : null;
            let createdAtStr = createdAt && !isNaN(createdAt) ? createdAt.toLocaleDateString() : 'N/A';
            html += `<p><b>Data înregistrare:</b> <span>${createdAtStr}</span></p>`;
            if (data.user.lastLogin) {
                let lastLogin = new Date(data.user.lastLogin);
                html += `<p><b>Ultima autentificare:</b> <span>${!isNaN(lastLogin) ? lastLogin.toLocaleString() : 'N/A'}</span></p>`;
            }
            infoEl.innerHTML = html;
            // Avatar custom dacă există
            if (data.user.avatar) {
                avatarEl.innerHTML = `<img src="${data.user.avatar}" alt="Avatar" onerror="this.onerror=null;this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(data.user.username)}';">`;
            } else {
                avatarEl.innerHTML = `<i class="fas fa-user-circle"></i>`;
            }
        } else {
            usernameEl.textContent = 'Nu ești autentificat!';
            roleEl.textContent = '';
            infoEl.innerHTML = '<p><a href="/login.html">Autentifică-te</a> pentru a-ți vedea profilul.</p>';
        }
    })
    .catch(() => {
        document.getElementById('profile-username').textContent = 'Eroare la conectare cu serverul';
        document.getElementById('profile-role').textContent = '';
        document.getElementById('profile-info').innerHTML = '';
    });

    // Form pentru schimbare avatar
    const avatarForm = document.getElementById('avatar-form');
    if (avatarForm) {
        avatarForm.addEventListener('submit', function (e) {
            e.preventDefault();
            const token = localStorage.getItem('authToken');
            const url = document.getElementById('avatar-url').value;
            const msg = document.getElementById('avatar-message');
            if (!url || !/^https?:\/\/.+\.(jpg|jpeg|png|gif)$/i.test(url)) {
                msg.textContent = "Introdu un link valid către o imagine (jpg/png/gif).";
                msg.style.color = "red";
                return;
            }
            msg.textContent = "Se trimite cererea...";
            fetch('/api/profile/avatar', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': token ? `Bearer ${token}` : ''
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

    // Funcționalitate schimbare parolă
    const form = document.getElementById('change-password-form');
    if (form) {
        form.addEventListener('submit', function (e) {
            e.preventDefault();
            const token = localStorage.getItem('authToken');
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
                    'Authorization': token ? `Bearer ${token}` : ''
                },
                body: JSON.stringify({
                    currentPassword,
                    newPassword
                })
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
