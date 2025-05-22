// Funcția care se execută când documentul este complet încărcat
document.addEventListener('DOMContentLoaded', function() {
    // Selectare elemente DOM
    const registerForm = document.getElementById('registerForm');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const adminTokenInput = document.getElementById('adminToken');
    const togglePassword = document.getElementById('togglePassword');
    const toggleAdminToken = document.getElementById('toggleAdminToken');
    const errorAlert = document.getElementById('errorAlert');
    const errorMessage = document.getElementById('errorMessage');
    const successAlert = document.getElementById('successAlert');
    const successMessage = document.getElementById('successMessage');

    // Adaugă eveniment pentru afișarea/ascunderea parolei
    togglePassword.addEventListener('click', function() {
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordInput.setAttribute('type', type);
        this.classList.toggle('fa-eye');
        this.classList.toggle('fa-eye-slash');
    });

    // Adaugă eveniment pentru afișarea/ascunderea token-ului admin
    toggleAdminToken.addEventListener('click', function() {
        const type = adminTokenInput.getAttribute('type') === 'password' ? 'text' : 'password';
        adminTokenInput.setAttribute('type', type);
        this.classList.toggle('fa-eye');
        this.classList.toggle('fa-eye-slash');
    });

    // Adaugă eveniment pentru procesarea formularului de înregistrare
    registerForm.addEventListener('submit', function(e) {
        e.preventDefault();

        // Ascunde mesajele de eroare anterioare
        errorAlert.style.display = 'none';
        successAlert.style.display = 'none';

        // Validare de bază
        if (!usernameInput.value || !passwordInput.value || !adminTokenInput.value) {
            errorMessage.textContent = 'Te rugăm să completezi toate câmpurile.';
            errorAlert.style.display = 'flex';
            return;
        }

        // Verificare complexitate parolă
        if (passwordInput.value.length < 8) {
            errorMessage.textContent = 'Parola trebuie să conțină minim 8 caractere.';
            errorAlert.style.display = 'flex';
            return;
        }

        // Dezactivează butonul pentru a preveni multiple submisii
        const submitButton = registerForm.querySelector('button[type="submit"]');
        const originalButtonText = submitButton.innerHTML;
        submitButton.disabled = true;
        submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Se procesează...';

        // Construire obiect cu datele de înregistrare
        const registerData = {
            username: usernameInput.value.trim(),
            password: passwordInput.value,
            adminToken: adminTokenInput.value
        };

        // Apel către API pentru înregistrare
        fetch('/api/admin/users', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${adminTokenInput.value}` // Token folosit pentru autorizare
            },
            body: JSON.stringify({
                username: usernameInput.value.trim(),
                password: passwordInput.value,
                role: 'admin'
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Înregistrare reușită
                successMessage.textContent = 'Cont creat cu succes! Vei fi redirecționat către pagina de login...';
                successAlert.style.display = 'flex';

                // Resetare formular
                registerForm.reset();

                // Redirecționare către pagina de login după 2 secunde
                setTimeout(() => {
                    window.location.href = '/login.html';
                }, 2000);
            } else {
                // Înregistrare eșuată
                errorMessage.textContent = data.message || 'Eroare la înregistrare. Te rugăm să încerci din nou.';
                errorAlert.style.display = 'flex';
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

    // Verifică dacă utilizatorul este deja autentificat
    const authToken = localStorage.getItem('authToken');
    if (authToken) {
        // Redirecționare către pagina de admin
        window.location.href = '/admin';
    }
});
