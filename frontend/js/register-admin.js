document.addEventListener('DOMContentLoaded', function() {
    const registerForm = document.getElementById('registerForm');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const adminTokenInput = document.getElementById('adminToken');
    const adminTokenGroup = document.getElementById('adminTokenGroup');
    const togglePassword = document.getElementById('togglePassword');
    const toggleAdminToken = document.getElementById('toggleAdminToken');
    const errorAlert = document.getElementById('errorAlert');
    const errorMessage = document.getElementById('errorMessage');
    const successAlert = document.getElementById('successAlert');
    const successMessage = document.getElementById('successMessage');
    const firstAdminAlert = document.getElementById('firstAdminAlert');

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

    let isFirstAdmin = false;

    fetch('/api/check-admin-exists')
        .then(response => response.json())
        .then(data => {
            if (data.success && !data.exists) {
                isFirstAdmin = true;
                firstAdminAlert.style.display = 'flex';
                adminTokenGroup.style.display = 'none';
                adminTokenInput.required = false;
            }
        })
        .catch(error => {
            console.error('Eroare la verificarea existenței admin:', error);
        });

    togglePassword.addEventListener('click', function() {
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordInput.setAttribute('type', type);
        this.classList.toggle('fa-eye');
        this.classList.toggle('fa-eye-slash');
    });

    if (toggleAdminToken) {
        toggleAdminToken.addEventListener('click', function() {
            const type = adminTokenInput.getAttribute('type') === 'password' ? 'text' : 'password';
            adminTokenInput.setAttribute('type', type);
            this.classList.toggle('fa-eye');
            this.classList.toggle('fa-eye-slash');
        });
    }

    registerForm.addEventListener('submit', function(e) {
        e.preventDefault();

        errorAlert.style.display = 'none';
        successAlert.style.display = 'none';

        if (!usernameInput.value || !passwordInput.value) {
            errorMessage.textContent = 'Te rugăm să completezi toate câmpurile obligatorii.';
            errorAlert.style.display = 'flex';
            return;
        }

        if (!isFirstAdmin && !adminTokenInput.value) {
            errorMessage.textContent = 'Codul de autorizare este necesar pentru crearea unui administrator nou.';
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
            password: passwordInput.value,
            role: 'admin'
        };

        let apiEndpoint = isFirstAdmin ? '/api/register' : '/api/admin/users';
        let headers = {
            'Content-Type': 'application/json'
        };

        if (!isFirstAdmin) {
            headers['Authorization'] = `Bearer ${adminTokenInput.value}`;
        }

        fetch(apiEndpoint, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(registerData)
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                successMessage.textContent = 'Cont administrator creat cu succes! Vei fi redirecționat...';
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
