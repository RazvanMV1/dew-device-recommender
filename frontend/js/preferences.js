// frontend/js/preferences.js

document.addEventListener('DOMContentLoaded', function () {
    const form = document.getElementById('preferences-form');
    const msg = document.getElementById('preferences-message');
    const token = localStorage.getItem('authToken');

    // Încarcă preferințele existente
    fetch('/api/profile/preferences', {
        headers: {
            'Authorization': token ? `Bearer ${token}` : ''
        }
    })
    .then(r => r.json())
    .then(data => {
        if (data.success && data.preferences) {
            // Bifează categoriile
            (data.preferences.categories || []).forEach(cat => {
                const el = form.querySelector(`input[name="category"][value="${cat}"]`);
                if (el) el.checked = true;
            });
            // Selectează intervalul de preț
            if (data.preferences.priceRange)
                form.priceRange.value = data.preferences.priceRange;
            // Bifează brandurile
            (data.preferences.brands || []).forEach(brand => {
                const el = form.querySelector(`input[name="brand"][value="${brand}"]`);
                if (el) el.checked = true;
            });
        }
    });

    // La submit salvează preferințele
    form.addEventListener('submit', function (e) {
        e.preventDefault();
        const categories = Array.from(form.querySelectorAll('input[name="category"]:checked')).map(cb => cb.value);
        const priceRange = form.priceRange.value;
        const brands = Array.from(form.querySelectorAll('input[name="brand"]:checked')).map(cb => cb.value);

        fetch('/api/profile/preferences', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': token ? `Bearer ${token}` : ''
            },
            body: JSON.stringify({
                categories,
                priceRange,
                brands
            })
        })
        .then(r => r.json())
        .then(data => {
            msg.textContent = data.success ? "Preferințe salvate!" : (data.message || "Eroare la salvare.");
            msg.style.color = data.success ? "green" : "red";
        })
        .catch(() => {
            msg.textContent = "Eroare la conectare cu serverul";
            msg.style.color = "red";
        });
    });
});
