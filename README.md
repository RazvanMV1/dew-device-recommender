# dew-device-recommender

ElectroRecommender este o platformă web care recomandă utilizatorilor dispozitive electronice (precum telefoane, laptopuri, tablete, smartwatch-uri, drone etc.) pe baza unor criterii inteligente precum preț, caracteristici tehnice și preferințele anterioare. Aplicația integrează mai multe surse externe prin scraping, API-uri și fluxuri RSS. Proiectul este dezvoltat fără framework-uri externe și conține și o extensie de browser ca funcționalitate bonus.

## Funcționalități principale

- Autentificare și înregistrare utilizatori (guest, membru, administrator)
- Recomandare de produse pe baza similarității (brand, categorie, preț, trăsături)
- Căutare, filtrare și sortare avansată
- Import de produse din surse externe (Amazon, BestBuy, DummyJSON etc.)
- Pagini separate pentru produse și știri
- Panou de administrare pentru gestionarea produselor, utilizatorilor, știrilor și surselor
- Generare de fluxuri RSS pentru noutăți și statistici
- Extensie de browser care afișează recomandări rapide

## Tehnologii folosite

- HTML5, CSS3, JavaScript (fără framework-uri)
- Node.js pentru backend (fără Express sau alt framework)
- MongoDB pentru stocarea datelor
- RSS pentru export de conținut
- Chrome Extension pentru funcționalitatea bonus

## Structura proiectului

- `frontend/` – Interfața vizuală (HTML, CSS, JS)
- `backend/` – Codul serverului, rutele API și logica aplicației
- `models/` – Modele de date (Product, User, News etc.)
- `scripts/` – Scraperi pentru surse externe
- `rss/` – Generator de fluxuri RSS
- `extension/` – Codul pentru extensia de browser
- `server.js` – Punctul principal de pornire al aplicației
- `config.js` – Configurația conexiunii la MongoDB

