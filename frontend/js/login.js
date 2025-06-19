document.addEventListener('DOMContentLoaded', function() {
    // Selectare elemente DOM
    const loginForm = document.getElementById('loginForm');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const togglePassword = document.getElementById('togglePassword');
    const errorAlert = document.getElementById('errorAlert');
    const errorMessage = document.getElementById('errorMessage');
    const successAlert = document.getElementById('successAlert');
    const successMessage = document.getElementById('successMessage');

    // Verifică dacă utilizatorul este deja autentificat
    const authToken = localStorage.getItem('authToken');
    if (authToken) {
        // Redirecționare către pagina corespunzătoare
        const userData = JSON.parse(localStorage.getItem('userData') || '{}');
        if (userData.role === 'admin') {
            window.location.href = '/admin';
        } else {
            window.location.href = '/';
        }
        return;
    }

    // Adaugă eveniment pentru afișarea/ascunderea parolei
    togglePassword.addEventListener('click', function() {
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordInput.setAttribute('type', type);
        this.classList.toggle('fa-eye');
        this.classList.toggle('fa-eye-slash');
    });

    // Adaugă eveniment pentru procesarea formularului de login
    loginForm.addEventListener('submit', function(e) {
        e.preventDefault();

        // Ascunde mesajele de eroare anterioare
        errorAlert.style.display = 'none';
        successAlert.style.display = 'none';

        // Validare de bază
        if (!usernameInput.value || !passwordInput.value) {
            errorMessage.textContent = 'Te rugăm să completezi toate câmpurile.';
            errorAlert.style.display = 'flex';
            return;
        }

        // Dezactivează butonul pentru a preveni multiple submisii
        const submitButton = loginForm.querySelector('button[type="submit"]');
        const originalButtonText = submitButton.innerHTML;
        submitButton.disabled = true;
        submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Se procesează...';

        // Construire obiect cu datele de autentificare
        const loginData = {
            username: usernameInput.value.trim(),
            password: passwordInput.value
        };

        // Apel către API pentru autentificare
        fetch('/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(loginData)
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Autentificare reușită
                successMessage.textContent = 'Autentificare reușită! Vei fi redirecționat...';
                successAlert.style.display = 'flex';

                // Salvare token în localStorage pentru autentificări ulterioare
                localStorage.setItem('authToken', data.token);

                // -- AICI este modificarea esențială --
                // Asigură-te că salvezi avatar, username și rol în userData
                localStorage.setItem('userData', JSON.stringify({
                    username: data.user.username,
                    role: data.user.role,
                    avatar: data.user.avatar || ''
                }));

                // Redirecționare către pagina corespunzătoare după 1 secundă
                setTimeout(() => {
                    if (data.user && data.user.role === 'admin') {
                        window.location.href = '/admin';
                    } else {
                        window.location.href = '/';
                    }
                }, 1000);
            } else {
                // Autentificare eșuată
                errorMessage.textContent = data.message || 'Autentificare eșuată. Verifică username-ul și parola.';
                errorAlert.style.display = 'flex';

                // Resetare formular
                passwordInput.value = '';
                passwordInput.focus();
            }
        })
        .catch(error => {
            console.error('Eroare:', error);
            errorMessage.textContent = 'A apărut o eroare la comunicarea cu serverul.';
            errorAlert.style.display = 'flex';
        })
        .finally(() => {
            // Reactivează butonul
            submitButton.disabled = false;
            submitButton.innerHTML = originalButtonText;
        });
    });
});
