const jwt = require('jsonwebtoken');
const User = require('../models/User');
const config = require('../config/config');

/**
 * Generează un token JWT pentru un utilizator
 * @param {Object} user - Utilizatorul pentru care se generează token-ul
 * @returns {String} Token JWT
 */
const generateToken = (user) => {
    return jwt.sign(
        {
            id: user._id,
            username: user.username,
            role: user.role
        },
        config.JWT_SECRET,
        { expiresIn: config.JWT_EXPIRES_IN }
    );
};

/**
 * Autentifică un utilizator și returnează token JWT
 * @param {String} username - Numele utilizatorului
 * @param {String} password - Parola utilizatorului
 * @returns {Object} Obiect cu rezultatul autentificării și eventual token
 */
const authenticate = async (username, password) => {
    try {
        // Caută utilizatorul în baza de date
        const user = await User.findOne({ username });

        if (!user) {
            return { success: false, message: 'Autentificare eșuată' };
        }

        // Verifică parola
        const isPasswordValid = await user.comparePassword(password);

        if (!isPasswordValid) {
            return { success: false, message: 'Autentificare eșuată' };
        }

        // Actualizează data ultimei autentificări
        user.lastLogin = Date.now();
        await user.save();

        // Generează token
        const token = generateToken(user);

        return {
            success: true,
            token,
            user: {
                id: user._id,
                username: user.username,
                role: user.role
            }
        };
    } catch (error) {
        console.error('Eroare la autentificare:', error);
        return { success: false, message: 'Eroare internă server' };
    }
};

/**
 * Creează un utilizator nou în baza de date
 * @param {Object} userData - Datele utilizatorului de creat
 * @returns {Object} Rezultatul operațiunii
 */
const registerUser = async (userData) => {
    try {
        // Verifică dacă utilizatorul există deja
        const existingUser = await User.findOne({ username: userData.username });

        if (existingUser) {
            return { success: false, message: 'Utilizatorul există deja' };
        }

        // Creează utilizatorul nou
        const newUser = new User({
            username: userData.username,
            password: userData.password,
            role: userData.role || 'admin'
        });

        // Salvează utilizatorul în baza de date (parola va fi hash-uită automat)
        await newUser.save();

        return {
            success: true,
            message: 'Utilizator înregistrat cu succes'
        };
    } catch (error) {
        console.error('Eroare la înregistrare:', error);
        return { success: false, message: 'Eroare internă server' };
    }
};

module.exports = {
    generateToken,
    authenticate,
    registerUser
};
