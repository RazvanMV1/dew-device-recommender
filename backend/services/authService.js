const jwt = require('jsonwebtoken');
const User = require('../models/User');
const config = require('../config/config');


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


const authenticate = async (username, password) => {
    try {
        const user = await User.findOne({ username });

        if (!user) {
            return { success: false, message: 'Autentificare eșuată' };
        }

        const isPasswordValid = await user.comparePassword(password);

        if (!isPasswordValid) {
            return { success: false, message: 'Autentificare eșuată' };
        }

        user.lastLogin = Date.now();
        await user.save();

        const token = generateToken(user);

        return {
            success: true,
            token,
            user: {
                id: user._id,
                username: user.username,
                role: user.role,
                avatar: user.avatar || ''
            }
        };

    } catch (error) {
        console.error('Eroare la autentificare:', error);
        return { success: false, message: 'Eroare internă server' };
    }
};

const registerUser = async (userData) => {
    try {
        const existingUser = await User.findOne({ username: userData.username });

        if (existingUser) {
            return { success: false, message: 'Utilizatorul există deja' };
        }

        const newUser = new User({
            username: userData.username,
            email: userData.email,
            password: userData.password,
            role: userData.role || 'admin'
        });

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
