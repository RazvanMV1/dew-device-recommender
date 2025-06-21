function isValidEmail(email) {
    const regex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
    return regex.test(email);
}

function isValidProductName(name) {
    return name && name.length >= 2 && name.length <= 100;
}

function isValidPrice(price) {
    return price !== undefined && !isNaN(price) && price >= 0;
}

function sanitizeText(text) {
    if (!text) return text;
    return text
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;');
}

function validateProduct(product) {
    const errors = [];

    if (!isValidProductName(product.name)) {
        errors.push('Numele produsului trebuie să aibă între 2 și 100 de caractere');
    }

    if (!isValidPrice(product.price)) {
        errors.push('Prețul trebuie să fie un număr pozitiv');
    }

    if (product.features && !Array.isArray(product.features)) {
        errors.push('Caracteristicile produsului trebuie să fie un array');
    }

    return {
        isValid: errors.length === 0,
        errors
    };
}

module.exports = {
    isValidEmail,
    isValidProductName,
    isValidPrice,
    sanitizeText,
    validateProduct
};
