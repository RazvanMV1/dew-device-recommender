// scripts/create-admin.js

require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const User = require('../models/User');
const connectDB = require('../db');
const readline = require('readline');

// Interfață pentru citirea de la tastatură
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Funcție pentru întrebări utilizator
function question(query) {
    return new Promise(resolve => {
        rl.question(query, resolve);
    });
}

async function createAdmin() {
    try {
        await connectDB();
        console.log('✅ Conectat la baza de date');

        // Solicită informații despre admin
        const username = await question('Numele de utilizator admin: ');
        const password = await question('Parola admin (minim 8 caractere): ');

        if (password.length < 8) {
            console.error('❌ Parola trebuie să aibă minim 8 caractere');
            rl.close();
            return;
        }

        // Verifică dacă utilizatorul există deja
        const existingUser = await User.findOne({ username });

        if (existingUser) {
            console.log('⚠️ Utilizatorul există deja. Doriți să actualizați parola? (da/nu)');
            const answer = await question('Răspuns: ');

            if (answer.toLowerCase() === 'da') {
                existingUser.password = password;
                await existingUser.save();
                console.log('✅ Parola administratorului a fost actualizată cu succes');
            } else {
                console.log('❌ Operațiune anulată');
            }
        } else {
            // Creează utilizator nou
            const newAdmin = new User({
                username,
                password,
                role: 'admin'
            });

            await newAdmin.save();
            console.log('✅ Administrator creat cu succes');
        }

        rl.close();
    } catch (error) {
        console.error('❌ Eroare:', error);
        rl.close();
    }
}

// Rulează funcția
createAdmin().then(() => {
    mongoose.connection.close();
    console.log('Conexiune închisă');
}).catch(err => {
    console.error('Eroare finală:', err);
    process.exit(1);
});
