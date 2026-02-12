const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function applyConstraints() {
    console.log('🔄 Applying Foreign Key Constraints to ensure inter-linking...');

    const dbConfig = {
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'time_tracking_db',
        port: process.env.DB_PORT || 3306
    };

    const connection = await mysql.createConnection(dbConfig);

    try {
        // 1. Ensure columns exist on users
        console.log('Checking columns on users table...');
        try {
            await connection.execute('ALTER TABLE users ADD COLUMN admin_id INT NULL AFTER id');
            console.log('✅ Added admin_id to users');
        } catch (err) {
            console.log('ℹ️ admin_id column in users table exists or error adding:', err.message);
        }

        // 2. Ensure columns exist on time_logs
        console.log('Checking columns on time_logs table...');
        try {
            await connection.execute('ALTER TABLE time_logs ADD COLUMN admin_id INT NULL AFTER user_id');
            console.log('✅ Added admin_id to time_logs');
        } catch (err) {
            console.log('ℹ️ admin_id column in time_logs table exists or error adding:', err.message);
        }

        // 3. Ensure foreign key on users -> admins
        console.log('Linking users to admins...');
        try {
            await connection.execute(`
                ALTER TABLE users 
                ADD CONSTRAINT fk_user_admin 
                FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE SET NULL
            `);
            console.log('✅ Added fk_user_admin');
        } catch (err) {
            if (err.code === 'ER_DUP_CONSTRAINT_NAME') {
                console.log('ℹ️ fk_user_admin already exists.');
            } else {
                console.log('⚠️ Error on fk_user_admin:', err.message);
            }
        }

        // 4. Ensure foreign keys on time_logs
        console.log('Linking time_logs to users and admins...');

        // user_id link
        try {
            await connection.execute(`
                ALTER TABLE time_logs 
                ADD CONSTRAINT fk_time_logs_user 
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            `);
            console.log('✅ Added fk_time_logs_user');
        } catch (err) {
            if (err.code === 'ER_DUP_CONSTRAINT_NAME') {
                console.log('ℹ️ fk_time_logs_user already exists.');
            } else {
                console.log('⚠️ Warning on fk_time_logs_user:', err.message);
            }
        }

        // admin_id link
        try {
            await connection.execute(`
                ALTER TABLE time_logs 
                ADD CONSTRAINT fk_time_logs_admin 
                FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE CASCADE
            `);
            console.log('✅ Added fk_time_logs_admin');
        } catch (err) {
            if (err.code === 'ER_DUP_CONSTRAINT_NAME') {
                console.log('ℹ️ fk_time_logs_admin already exists.');
            } else {
                console.log('⚠️ Warning on fk_time_logs_admin:', err.message);
            }
        }

        console.log('✨ Database inter-linking constraints applied successfully!');

    } catch (err) {
        console.error('❌ Failed to apply constraints:', err);
    } finally {
        await connection.end();
    }
}

applyConstraints();
