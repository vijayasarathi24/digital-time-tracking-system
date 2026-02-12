const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function testLogin() {
    console.log('Testing Admin Login...');

    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: process.env.DB_PORT
    });

    const username = 'user';
    const password = 'user123';

    try {
        const [admins] = await connection.execute('SELECT * FROM users WHERE username = ?', [username]);
        if (admins.length === 0) {
            console.log('❌ User not found');
            return;
        }

        const admin = admins[0];
        console.log('User found:', admin.username);
        console.log('Stored Hash:', admin.password_hash);

        const match = await bcrypt.compare(password, admin.password_hash);
        console.log('Password Match:', match);

        if (match) {
            console.log('✅ Login Successful!');
        } else {
            console.log('❌ Login Failed - Password Mismatch');
            // Debug: generate new hash
            const newHash = await bcrypt.hash(password, 10);
            console.log('Expected Hash for user123 should be like:', newHash);
        }

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await connection.end();
    }
}

testLogin();
