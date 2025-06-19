document.addEventListener('DOMContentLoaded', function() {
// Verifică dacă utilizatorul este autentificat
const checkAuth = () => {
const authToken = localStorage.getItem('authToken');
if (!authToken) {
window.location.href = '/login';
return false;
}
return true;
};

// Verifică autentificarea
if (!checkAuth()) return;

// Inițializează interfața de utilizator
initUI();

// Încarcă datele inițiale
loadDashboardData();

// Atașează evenimentele
attachEventListeners();
});

// Funcție pentru inițializarea interfeței utilizator
function initUI() {
// Setează numele utilizatorului din localStorage
try {
const userData = JSON.parse(localStorage.getItem('userData') || '{}');
document.getElementById('user-name').textContent = userData.username || 'Administrator';
document.getElementById('user-role').textContent = userData.role === 'admin' ? 'Administrator' : 'Utilizator';
} catch (error) {
console.error('Eroare la încărcarea datelor utilizatorului:', error);
}

// Setează data actualizării
const lastUpdateDate = document.getElementById('last-update-date');
const now = new Date();
lastUpdateDate.textContent = now.toLocaleDateString('ro-RO', {
day: 'numeric',
month: 'long',
hour: '2-digit',
minute: '2-digit'
});

// Inițializează navigarea în sidebar
initSidebar();
}

// Funcție pentru inițializarea sidebarului și navigarea între secțiuni
function initSidebar() {
const sidebar = document.getElementById('sidebar');
const toggleSidebar = document.getElementById('toggle-sidebar');
const navLinks = document.querySelectorAll('.sidebar-nav a');
const pageTitle = document.getElementById('page-title');
const currentPage = document.getElementById('current-page');

// Toggle pentru sidebar collapse
toggleSidebar.addEventListener('click', () => {
sidebar.classList.toggle('collapsed');
});

// Navigare între secțiuni
navLinks.forEach(link => {
link.addEventListener('click', (e) => {
e.preventDefault();
const section = link.getAttribute('data-section');
const sectionTitle = link.querySelector('span').textContent;

// Dezactivează link-ul activ anterior și activează link-ul curent
document.querySelector('.sidebar-nav li.active').classList.remove('active');
link.parentElement.classList.add('active');

// Ascunde toate secțiunile și afișează doar secțiunea selectată
document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
document.getElementById(section).classList.add('active');

// Actualizează titlul paginii și breadcrumb-ul
pageTitle.textContent = sectionTitle;
currentPage.textContent = sectionTitle;

// Încarcă datele pentru secțiunea selectată
if (section === 'products-section') {
loadProducts();
} else if (section === 'sources-section') {
loadSources();
} else if (section === 'users-section') {
// Aici se vor încărca utilizatorii
}
});
});
}

// Funcție pentru atașarea event listener-ilor
function attachEventListeners() {
// Ascultător pentru butonul de logout
document.getElementById('logout-button').addEventListener('click', logout);
document.getElementById('dropdown-logout').addEventListener('click', logout);

// Ascultător pentru butonul de refresh
document.querySelector('.btn-refresh').addEventListener('click', () => {
loadDashboardData();
});

// Ascultători pentru modal-uri
initModals();

// Ascultători pentru formulare
initForms();
}

// Funcție pentru inițializarea modal-urilor
function initModals() {
// Referințe la modal-uri
const productModal = document.getElementById('product-modal');
const sourceModal = document.getElementById('source-modal');
const confirmModal = document.getElementById('confirm-modal');
const modals = [productModal, sourceModal, confirmModal];

// Funcție pentru deschiderea unui modal
window.openModal = function(modalId) {
const modal = document.getElementById(modalId);
modal.classList.add('active');
document.body.style.overflow = 'hidden'; // Previne scrollarea în pagină
};

// Funcție pentru închiderea unui modal
window.closeModal = function(modalId) {
const modal = document.getElementById(modalId);
modal.classList.remove('active');
document.body.style.overflow = ''; // Permite scrollarea în pagină
};

// Închide modal la click pe butonul de închidere sau în afara conținutului
modals.forEach(modal => {
const closeBtn = modal.querySelector('.close-modal');
const cancelBtn = modal.querySelector('button[id^="cancel-"]');

if (closeBtn) {
closeBtn.addEventListener('click', () => {
closeModal(modal.id);
});
}

if (cancelBtn) {
cancelBtn.addEventListener('click', () => {
closeModal(modal.id);
});
}

modal.addEventListener('click', (e) => {
if (e.target === modal) {
closeModal(modal.id);
}
});
});

// Inițializează butoanele pentru adăugarea de produse și surse
document.getElementById('add-product-btn').addEventListener('click', () => {
document.getElementById('product-modal-title').textContent = 'Adaugă produs nou';
document.getElementById('product-form').reset();
document.getElementById('product-id').value = '';
openModal('product-modal');
});

document.getElementById('add-source-btn').addEventListener('click', () => {
document.getElementById('source-modal-title').textContent = 'Adaugă sursă nouă';
document.getElementById('source-form').reset();
document.getElementById('source-id').value = '';
openModal('source-modal');
});
}

// Funcție pentru inițializarea formularelor
function initForms() {
// Formular pentru produse
const productForm = document.getElementById('product-form');
const saveProductBtn = document.getElementById('save-product');

saveProductBtn.addEventListener('click', async () => {
// Validează formularul
if (!productForm.checkValidity()) {
productForm.reportValidity();
return;
}

// Construiește obiectul de produs
const productData = {
name: document.getElementById('product-name').value,
brand: document.getElementById('product-brand').value,
category: document.getElementById('product-category').value,
price: parseFloat(document.getElementById('product-price').value),
color: document.getElementById('product-color').value,
image: document.getElementById('product-image').value,
features: document.getElementById('product-features').value
.split('\n')
.filter(line => line.trim() !== '')
};

// Verifică dacă este actualizare sau creare
const productId = document.getElementById('product-id').value;
const isUpdate = productId !== '';

try {
// Construiește opțiunile pentru cerere
const options = {
method: isUpdate ? 'PUT' : 'POST',
headers: {
'Content-Type': 'application/json',
'Authorization': `Bearer ${localStorage.getItem('authToken')}`
},
body: JSON.stringify(productData)
};

// Efectuează cererea către API
const url = isUpdate ? `/api/products/${productId}` : '/api/products';
const response = await fetch(url, options);
const data = await response.json();

if (data.success) {
// Închide modal-ul și actualizează lista de produse
closeModal('product-modal');
loadProducts();

// Afișează un mesaj de succes (poate fi implementat un sistem de notificări)
alert(isUpdate ? 'Produs actualizat cu succes!' : 'Produs adăugat cu succes!');
} else {
alert(`Eroare: ${data.message}`);
}
} catch (error) {
console.error('Eroare la salvarea produsului:', error);
alert('A apărut o eroare la salvarea produsului. Te rugăm să încerci din nou.');
}
});

// Formular pentru surse
const sourceForm = document.getElementById('source-form');
const saveSourceBtn = document.getElementById('save-source');

saveSourceBtn.addEventListener('click', async () => {
// Validează formularul
if (!sourceForm.checkValidity()) {
sourceForm.reportValidity();
return;
}

// Construiește obiectul de sursă
const sourceData = {
name: document.getElementById('source-name').value,
type: document.getElementById('source-type').value,
url: document.getElementById('source-url').value,
description: document.getElementById('source-description').value,
updateFrequency: parseInt(document.getElementById('source-update-freq').value),
active: document.getElementById('source-active').value === 'true'
};

// Verifică dacă este actualizare sau creare
const sourceId = document.getElementById('source-id').value;
const isUpdate = sourceId !== '';

try {
// Construiește opțiunile pentru cerere
const options = {
method: isUpdate ? 'PUT' : 'POST',
headers: {
'Content-Type': 'application/json',
'Authorization': `Bearer ${localStorage.getItem('authToken')}`
},
body: JSON.stringify(sourceData)
};

// Efectuează cererea către API
const url = isUpdate ? `/api/sources/${sourceId}` : '/api/sources';
const response = await fetch(url, options);
const data = await response.json();

if (data.success) {
// Închide modal-ul și actualizează lista de surse
closeModal('source-modal');
loadSources();

// Afișează un mesaj de succes
alert(isUpdate ? 'Sursă actualizată cu succes!' : 'Sursă adăugată cu succes!');
} else {
alert(`Eroare: ${data.message}`);
}
} catch (error) {
console.error('Eroare la salvarea sursei:', error);
alert('A apărut o eroare la salvarea sursei. Te rugăm să încerci din nou.');
}
});

// Modal de confirmare
const confirmActionBtn = document.getElementById('confirm-action');
confirmActionBtn.addEventListener('click', () => {
// ID-ul și tipul elementului de șters vor fi setate când se deschide modal-ul
const itemId = confirmActionBtn.getAttribute('data-id');
const itemType = confirmActionBtn.getAttribute('data-type');

deleteItem(itemType, itemId);
});
}

// Funcție pentru încărcarea datelor pentru dashboard
async function loadDashboardData() {
try {
// Încarcă date pentru statistici
await loadStats();

// Încarcă activitatea recentă
await loadRecentActivity();

// Actualizează data ultimei actualizări
const lastUpdateDate = document.getElementById('last-update-date');
const now = new Date();
lastUpdateDate.textContent = now.toLocaleDateString('ro-RO', {
day: 'numeric',
month: 'long',
hour: '2-digit',
minute: '2-digit'
});
} catch (error) {
console.error('Eroare la încărcarea datelor dashboard:', error);
}
}

// Funcție pentru încărcarea statisticilor
async function loadStats() {
try {
// Solicită date statistice de la API
const [productsResponse, sourcesResponse, newsResponse, usersResponse] = await Promise.all([
fetch('/api/products?limit=1'),
fetch('/api/sources?limit=1'),
fetch('/api/news?limit=1'),
fetch('/api/users', {
headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
})
]);

// Extrage numărul total de elemente din fiecare răspuns
const productsData = await productsResponse.json();
const sourcesData = await sourcesResponse.json();
const newsData = await newsResponse.json();

// Actualizează elementele HTML cu statistici
document.getElementById('products-count').textContent = productsData.total || 0;
document.getElementById('sources-count').textContent = sourcesData.total || 0;
document.getElementById('news-count').textContent = newsData.total || 0;

// Pentru utilizatori, s-ar putea să nu aveți acces direct, deci gestionăm posibilitatea de eroare
try {
const usersData = await usersResponse.json();
document.getElementById('users-count').textContent = usersData.total || 0;
} catch (e) {
document.getElementById('users-count').textContent = '1'; // Valoare implicită dacă nu se poate accesa
}
} catch (error) {
console.error('Eroare la încărcarea statisticilor:', error);

// Setează valori implicite în caz de eroare
document.getElementById('products-count').textContent = '0';
document.getElementById('sources-count').textContent = '0';
document.getElementById('news-count').textContent = '0';
document.getElementById('users-count').textContent = '0';
}
}

// Funcție pentru încărcarea activității recente
async function loadRecentActivity() {
// În implementarea reală, ai putea avea un API dedicat pentru activități recente
// Aici simulăm activitățile recente cu date statice pentru exemplu
const activityList = document.getElementById('activity-list');

// Curăță lista de activități existentă
activityList.innerHTML = '';

// Simulare activități recente
const activities = [
{
type: 'add',
icon: 'fas fa-plus',
title: 'Produs nou adăugat',
description: 'Samsung Galaxy S21 Ultra a fost adăugat în baza de date',
time: 'Acum 2 ore'
},
{
type: 'update',
icon: 'fas fa-sync',
title: 'Actualizare surse RSS',
description: 'S-au colectat 15 noi știri de la sursele RSS',
time: 'Acum 4 ore'
},
{
type: 'user',
icon: 'fas fa-user',
title: 'Utilizator nou înregistrat',
description: 'Utilizatorul "maria_pop" s-a înregistrat în sistem',
time: 'Acum 6 ore'
}
];

// Adaugă activitățile în listă
activities.forEach(activity => {
const iconClass = activity.type === 'add' ? 'bg-blue' :
activity.type === 'update' ? 'bg-green' :
activity.type === 'user' ? 'bg-orange' : 'bg-purple';

const activityItem = document.createElement('div');
activityItem.className = 'activity-item';
activityItem.innerHTML = `
<div class="activity-icon ${iconClass}">
    <i class="${activity.icon}"></i>
</div>
<div class="activity-details">
    <h4>${activity.title}</h4>
    <p>${activity.description}</p>
    <span class="activity-time">${activity.time}</span>
</div>
`;

activityList.appendChild(activityItem);
});
}

// Funcție pentru încărcarea produselor
async function loadProducts() {
try {
// Obține parametrii de filtrare
const category = document.getElementById('product-category-filter').value;
const sortValue = document.getElementById('product-sort').value;
const searchQuery = document.getElementById('product-search').value;

// Construiește query-ul
let query = '?limit=10';
if (category) query += `&category=${category}`;

// Determină sortarea
if (sortValue === 'price-asc') query += '&sort=price:asc';
else if (sortValue === 'price-desc') query += '&sort=price:desc';
else if (sortValue === 'name-asc') query += '&sort=name:asc';
else query += '&sort=createdAt:desc'; // Sortare implicită după cele mai noi

// Solicită date de la API
const response = await fetch(`/api/products${query}`);
const data = await response.json();

if (data.success) {
// Populează tabelul cu produse
const tableBody = document.querySelector('#products-table tbody');
tableBody.innerHTML = ''; // Curăță tabelul

data.products.forEach(product => {
// Filtrare după numele produsului (dacă există căutare)
if (searchQuery && !product.name.toLowerCase().includes(searchQuery.toLowerCase())) {
return; // Sari peste acest produs dacă nu se potrivește căutării
}

const row = document.createElement('tr');
row.innerHTML = `
<td>${product._id.substring(0, 8)}...</td>
<td>${product.image ? `<img src="${product.image}" alt="${product.name}" style="width:40px;height:40px;object-fit:cover;border-radius:5px;">` : '<i class="fas fa-image" style="color:#aaa;font-size:1.5rem;"></i>'}</td>
<td>${product.name}</td>
<td>${product.category || '-'}</td>
<td>${product.brand || '-'}</td>
<td>${product.price.toFixed(2)} RON</td>
<td>${new Date(product.createdAt).toLocaleDateString('ro-RO')}</td>
<td>
    <div class="table-actions">
        <button class="action-btn edit" onclick="editProduct('${product._id}')">
            <i class="fas fa-edit"></i>
        </button>
        <button class="action-btn delete" onclick="confirmDelete('product', '${product._id}')">
            <i class="fas fa-trash"></i>
        </button>
    </div>
</td>
`;

tableBody.appendChild(row);
});

// Actualizează paginarea (simplificat)
// updatePagination('products-pagination', data.page, data.totalPages, loadProducts);
} else {
console.error('Eroare la încărcarea produselor:', data.message);
}
} catch (error) {
console.error('Eroare la încărcarea produselor:', error);
}
}

// Funcție pentru încărcarea surselor
async function loadSources() {
try {
// Obține parametrii de filtrare
const type = document.getElementById('source-type-filter').value;
const status = document.getElementById('source-status-filter').value;
const searchQuery = document.getElementById('source-search').value;

// Construiește query-ul
let query = '?limit=10';
if (type) query += `&type=${type}`;
if (status) query += `&active=${status === 'active'}`;

// Solicită date de la API
const response = await fetch(`/api/sources${query}`, {
headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
});
const data = await response.json();

if (data.success) {
// Populează tabelul cu surse
const tableBody = document.querySelector('#sources-table tbody');
tableBody.innerHTML = ''; // Curăță tabelul

data.sources.forEach(source => {
// Filtrare după numele sursei (dacă există căutare)
if (searchQuery && !source.name.toLowerCase().includes(searchQuery.toLowerCase())) {
return; // Sari peste această sursă dacă nu se potrivește căutării
}

const row = document.createElement('tr');
row.innerHTML = `
<td>${source._id.substring(0, 8)}...</td>
<td>${source.name}</td>
<td>${source.type}</td>
<td>${source.url.substring(0, 30)}${source.url.length > 30 ? '...' : ''}</td>
<td><span class="status ${source.active ? 'status-active' : 'status-inactive'}">${source.active ? 'Activ' : 'Inactiv'}</span></td>
<td>${source.lastUpdated ? new Date(source.lastUpdated).toLocaleDateString('ro-RO', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Niciodată'}</td>
<td>
    <div class="table-actions">
        <button class="action-btn edit" onclick="editSource('${source._id}')">
            <i class="fas fa-edit"></i>
        </button>
        <button class="action-btn ${source.active ? 'pause' : 'play'}" onclick="toggleSourceStatus('${source._id}', ${!source.active})">
            <i class="fas fa-${source.active ? 'pause' : 'play'}"></i>
        </button>
        <button class="action-btn delete" onclick="confirmDelete('source', '${source._id}')">
            <i class="fas fa-trash"></i>
        </button>
    </div>
</td>
`;

tableBody.appendChild(row);
});
} else {
console.error('Eroare la încărcarea surselor:', data.message);
}
} catch (error) {
console.error('Eroare la încărcarea surselor:', error);
}
}

// Funcție pentru editarea unui produs
window.editProduct = async function(productId) {
try {
const response = await fetch(`/api/products/${productId}`);
const data = await response.json();

if (data.success && data.product) {
const product = data.product;

// Completează formularul cu datele produsului
document.getElementById('product-modal-title').textContent = 'Editare produs';
document.getElementById('product-name').value = product.name;
document.getElementById('product-brand').value = product.brand || '';
document.getElementById('product-category').value = product.category || '';
document.getElementById('product-price').value = product.price;
document.getElementById('product-color').value = product.color || '';
document.getElementById('product-image').value = product.image || '';
document.getElementById('product-features').value = (product.features || []).join('\n');
document.getElementById('product-id').value = productId;

// Deschide modal-ul
openModal('product-modal');
} else {
alert('Eroare la încărcarea datelor produsului');
}
} catch (error) {
console.error('Eroare la editarea produsului:', error);
alert('A apărut o eroare la încărcarea datelor produsului');
}
};

// Funcție pentru editarea unei surse
window.editSource = async function(sourceId) {
try {
const response = await fetch(`/api/sources/${sourceId}`, {
headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
});
const data = await response.json();

if (data.success && data.source) {
const source = data.source;

// Completează formularul cu datele sursei
document.getElementById('source-modal-title').textContent = 'Editare sursă';
document.getElementById('source-name').value = source.name;
document.getElementById('source-type').value = source.type;
document.getElementById('source-url').value = source.url;
document.getElementById('source-description').value = source.description || '';
document.getElementById('source-update-freq').value = source.updateFrequency || 60;
document.getElementById('source-active').value = source.active ? 'true' : 'false';
document.getElementById('source-id').value = sourceId;

// Deschide modal-ul
openModal('source-modal');
} else {
alert('Eroare la încărcarea datelor sursei');
}
} catch (error) {
console.error('Eroare la editarea sursei:', error);
alert('A apărut o eroare la încărcarea datelor sursei');
}
};

// Funcție pentru confirmarea ștergerii
window.confirmDelete = function(itemType, itemId) {
const confirmMessage = document.getElementById('confirm-message');
const confirmActionBtn = document.getElementById('confirm-action');

if (itemType === 'product') {
confirmMessage.textContent = 'Ești sigur că vrei să ștergi acest produs? Această acțiune nu poate fi anulată.';
confirmActionBtn.textContent = 'Șterge produs';
} else if (itemType === 'source') {
confirmMessage.textContent = 'Ești sigur că vrei să ștergi această sursă? Această acțiune nu poate fi anulată.';
confirmActionBtn.textContent = 'Șterge sursă';
}

confirmActionBtn.setAttribute('data-id', itemId);
confirmActionBtn.setAttribute('data-type', itemType);

openModal('confirm-modal');
};

// Funcție pentru schimbarea statusului sursei
window.toggleSourceStatus = async function(sourceId, active) {
try {
const response = await fetch(`/api/sources/${sourceId}/toggle-active`, {
method: 'PATCH',
headers: {
'Content-Type': 'application/json',
'Authorization': `Bearer ${localStorage.getItem('authToken')}`
},
body: JSON.stringify({ active })
});

const data = await response.json();

if (data.success) {
loadSources(); // Reîncarcă lista de surse
alert(`Sursa a fost ${active ? 'activată' : 'dezactivată'} cu succes!`);
} else {
alert(`Eroare: ${data.message}`);
}
} catch (error) {
console.error('Eroare la actualizarea statusului sursei:', error);
alert('A apărut o eroare la actualizarea statusului sursei');
}
};

// Funcție pentru ștergerea unui element
async function deleteItem(itemType, itemId) {
try {
let endpoint;

if (itemType === 'product') {
endpoint = `/api/products/${itemId}`;
} else if (itemType === 'source') {
endpoint = `/api/sources/${itemId}`;
} else {
throw new Error('Tip de element invalid');
}

const response = await fetch(endpoint, {
method: 'DELETE',
headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
});

const data = await response.json();

if (data.success) {
// Închide modal-ul de confirmare
closeModal('confirm-modal');

// Reîncarcă lista de elemente
if (itemType === 'product') {
loadProducts();
} else if (itemType === 'source') {
loadSources();
}

alert(itemType === 'product' ? 'Produs șters cu succes!' : 'Sursă ștearsă cu succes!');
} else {
alert(`Eroare: ${data.message}`);
}
} catch (error) {
console.error('Eroare la ștergerea elementului:', error);
alert('A apărut o eroare la ștergerea elementului');
}
}

// Funcție pentru deconectare
function logout() {
// Șterge token-ul din localStorage
localStorage.removeItem('authToken');
localStorage.removeItem('userData');

// Redirecționează către pagina de login
window.location.href = '/login';
}

// Atașează event listeners pentru filtrare
document.addEventListener('DOMContentLoaded', function() {
// Filtrare produse
const productCategoryFilter = document.getElementById('product-category-filter');
const productSort = document.getElementById('product-sort');
const productSearch = document.getElementById('product-search');

if (productCategoryFilter) {
productCategoryFilter.addEventListener('change', loadProducts);
}

if (productSort) {
productSort.addEventListener('change', loadProducts);
}

if (productSearch) {
productSearch.addEventListener('input', debounce(loadProducts, 300));
}

// Filtrare surse
const sourceTypeFilter = document.getElementById('source-type-filter');
const sourceStatusFilter = document.getElementById('source-status-filter');
const sourceSearch = document.getElementById('source-search');

if (sourceTypeFilter) {
sourceTypeFilter.addEventListener('change', loadSources);
}

if (sourceStatusFilter) {
sourceStatusFilter.addEventListener('change', loadSources);
}

if (sourceSearch) {
sourceSearch.addEventListener('input', debounce(loadSources, 300));
}
});

// Utilitar pentru debounce
function debounce(func, wait) {
let timeout;
return function() {
const context = this;
const args = arguments;
clearTimeout(timeout);
timeout = setTimeout(() => {
func.apply(context, args);
}, wait);
};
}