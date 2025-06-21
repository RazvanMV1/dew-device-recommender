document.addEventListener('DOMContentLoaded', function() {
    const registerForm = document.getElementById('registerForm');
    const usernameInput = document.getElementById('username');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const togglePassword = document.getElementById('togglePassword');
    const errorAlert = document.getElementById('errorAlert');
    const errorMessage = document.getElementById('errorMessage');
    const successAlert = document.getElementById('successAlert');
    const successMessage = document.getElementById('successMessage');

    const authToken = localStorage.getItem('authToken');
    if (authToken) {
        const userData = JSON.parse(localStorage.getItem('userData') || '{}');
        if (userData.role === 'admin') {
            window.location.href = '/admin';
        } else {
            window.location.href = '/';
        }
        return;
    }

    togglePassword.addEventListener('click', function() {
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordInput.setAttribute('type', type);
        this.classList.toggle('fa-eye');
        this.classList.toggle('fa-eye-slash');
    });

    registerForm.addEventListener('submit', function(e) {
        e.preventDefault();

        errorAlert.style.display = 'none';
        successAlert.style.display = 'none';

        if (!usernameInput.value || !emailInput.value || !passwordInput.value) {
            errorMessage.textContent = 'Te rugăm să completezi toate câmpurile.';
            errorAlert.style.display = 'flex';
            return;
        }

        if (passwordInput.value.length < 8) {
            errorMessage.textContent = 'Parola trebuie să conțină minim 8 caractere.';
            errorAlert.style.display = 'flex';
            return;
        }

        const submitButton = registerForm.querySelector('button[type="submit"]');
        const originalButtonText = submitButton.innerHTML;
        submitButton.disabled = true;
        submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Se procesează...';

        const registerData = {
            username: usernameInput.value.trim(),
            email: emailInput.value.trim(),
            password: passwordInput.value,
            role: 'member'
        };

        fetch('/api/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(registerData)
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                successMessage.textContent = 'Cont creat cu succes! Vei fi redirecționat către pagina de login...';
                successAlert.style.display = 'flex';

                registerForm.reset();

                setTimeout(() => {
                    window.location.href = '/login';
                }, 2000);
            } else {
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
            submitButton.disabled = false;
            submitButton.innerHTML = originalButtonText;
        });
    });
});
