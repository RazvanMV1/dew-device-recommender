function loadHeader(containerId = 'header-placeholder', onLoaded) {
    fetch('components/header.html')
        .then(res => res.text())
        .then(data => {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = data.trim();
            const header = tempDiv.firstElementChild;

            document.body.insertBefore(header, document.body.firstChild);

            const placeholder = document.getElementById(containerId);
            if (placeholder) placeholder.remove();

            if (!document.getElementById('header-css')) {
                const link = document.createElement('link');
                link.id = 'header-css';
                link.rel = 'stylesheet';
                link.href = 'components/header.css';
                document.head.appendChild(link);
            }

            initHeaderSearch();
            initHeaderEvents();
            checkAuthStatus();

            if (typeof onLoaded === 'function') onLoaded();
        });
}

function initHeaderEvents() {
    const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
    const mainNav = document.querySelector('.main-nav');
    if (mobileMenuToggle && mainNav) {
        mobileMenuToggle.addEventListener('click', function () {
            this.classList.toggle('active');
            mainNav.classList.toggle('active');
        });
    }

    const userMenuTrigger = document.getElementById('user-menu-trigger');
    const userMenu = document.getElementById('user-menu');
    if (userMenuTrigger && userMenu) {
        userMenuTrigger.addEventListener('click', function (e) {
            e.stopPropagation();
            userMenu.classList.toggle('active');
        });
        document.addEventListener('click', function (event) {
            if (!userMenu.contains(event.target) && !userMenuTrigger.contains(event.target)) {
                userMenu.classList.remove('active');
            }
        });
    }
}

function initHeaderSearch() {
    const searchInput = document.getElementById('search-input');
    const searchBtn = document.getElementById('search-btn');
    if (searchInput) {
        searchInput.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') {
                const query = searchInput.value.trim();
                if (query.length > 0) {
                    window.location.href = `/products?search=${encodeURIComponent(query)}`;
                }
            }
        });
    }
    if (searchBtn && searchInput) {
        searchBtn.addEventListener('click', function () {
            const query = searchInput.value.trim();
            if (query.length > 0) {
                window.location.href = `/products?search=${encodeURIComponent(query)}`;
            }
        });
    }
}

function checkAuthStatus() {
    try {
        const authToken = localStorage.getItem('authToken');
        const userData = JSON.parse(localStorage.getItem('userData') || '{}');

        const userNameElement = document.querySelector('.user-name');
        const avatarHeader = document.getElementById('header-avatar');
        const dropdownUserName = document.getElementById('dropdown-user-name');
        const dropdownUserRole = document.getElementById('dropdown-user-role');
        const profileLink = document.getElementById('profile-link');
        const preferencesLink = document.getElementById('preferences-link');
        const logoutLink = document.getElementById('logout-link');
        const authLink = document.getElementById('auth-link');
        const registerLink = document.getElementById('register-link');

        if (authToken) {
            const username = userData.username || 'Utilizator';
            const role = userData.role === 'admin' ? 'Administrator' : 'Membru';

            if (userNameElement) userNameElement.textContent = username;
            if (dropdownUserName) dropdownUserName.textContent = username;
            if (dropdownUserRole) dropdownUserRole.textContent = role;

            if (profileLink) profileLink.style.display = 'flex';
            if (preferencesLink) preferencesLink.style.display = 'flex';
            if (logoutLink) logoutLink.style.display = 'flex';
            if (authLink) authLink.style.display = 'none';
            if (registerLink) registerLink.style.display = 'none';

            if (avatarHeader) {
                if (userData.avatar && userData.avatar.length > 5) {
                    avatarHeader.innerHTML = `<img src="${userData.avatar}" alt="avatar" />`;
                } else {
                    avatarHeader.innerHTML = '';
                }
            }

            if (logoutLink) {
                logoutLink.onclick = function(e) {
                    e.preventDefault();
                    localStorage.removeItem('authToken');
                    localStorage.removeItem('userData');
                    window.location.reload();
                };
            }
        } else {
            if (userNameElement) userNameElement.textContent = 'Contul meu';
            if (dropdownUserName) dropdownUserName.textContent = 'Oaspete';
            if (dropdownUserRole) dropdownUserRole.textContent = 'Neautentificat';

            if (profileLink) profileLink.style.display = 'none';
            if (preferencesLink) preferencesLink.style.display = 'none';
            if (logoutLink) logoutLink.style.display = 'none';
            if (authLink) authLink.style.display = 'flex';
            if (registerLink) registerLink.style.display = 'flex';

            if (avatarHeader) {
                avatarHeader.innerHTML = '';
            }
        }
    } catch (err) {
        console.error('Eroare la verificarea autentificării:', err);
    }
}
