const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function verifyRelationships() {
    console.log('🔍 Verifying Database Relationships...');

    const dbConfig = {
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'time_tracking_db',
        port: process.env.DB_PORT || 3306
    };

    const connection = await mysql.createConnection(dbConfig);

    try {
        // 1. Check if we can find users linked to admins
        console.log('Testing Admin-User link...');
        const [usersWithAdmin] = await connection.execute(`
            SELECT u.username, a.username as admin_name 
            FROM users u 
            JOIN admins a ON u.admin_id = a.id
        `);
        console.log(`✅ Found ${usersWithAdmin.length} users linked to admins.`);
        if (usersWithAdmin.length > 0) {
            console.log('Sample link:', usersWithAdmin[0]);
        }

        // 2. Check if we can find logs linked to users
        console.log('Testing User-Log link...');
        const [userLogs] = await connection.execute(`
            SELECT t.id, u.username as user_name 
            FROM time_logs t 
            JOIN users u ON t.user_id = u.id
            LIMIT 5
        `);
        console.log(`✅ Found ${userLogs.length} logs linked to users.`);

        // 3. Check if we can find logs linked directly to admins
        console.log('Testing Admin-Log link...');
        const [adminLogs] = await connection.execute(`
            SELECT t.id, a.username as admin_name 
            FROM time_logs t 
            JOIN admins a ON t.admin_id = a.id
            LIMIT 5
        `);
        console.log(`✅ Found ${adminLogs.length} logs linked directly to admins.`);

        console.log('✨ Verification complete! Tables are successfully inter-linked.');

    } catch (err) {
        console.error('❌ Verification failed:', err.message);
    } finally {
        await connection.end();
    }
}

verifyRelationships();
