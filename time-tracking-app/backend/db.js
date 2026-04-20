const mysql = require('mysql2');

// Environment Detection
const isProduction = process.env.NODE_ENV === 'production';

// Database Configuration
const dbConfig = {
    host: isProduction ? (process.env.DB_HOST || 'nozomi.proxy.rlwy.net') : (process.env.DB_HOST || 'localhost'),
    port: parseInt(isProduction ? (process.env.DB_PORT || '14103') : (process.env.DB_PORT || '3306')),
    user: isProduction ? (process.env.DB_USER || 'root') : (process.env.DB_USER || 'root'),
    password: isProduction ? (process.env.DB_PASSWORD || 'EuldKOUtavEegyjaSCiKvxGRpFEjAMUb') : (process.env.DB_PASSWORD || 'Nsv@24092005'),
    database: isProduction ? (process.env.DB_NAME || 'railway') : (process.env.DB_NAME || 'time_tracking_db'),
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    ssl: isProduction ? { rejectUnauthorized: false } : null
};

const pool = mysql.createPool(dbConfig);
const dbPromise = pool.promise();

// Connection Test & Data Verification
dbPromise.getConnection()
    .then(async (conn) => {
        console.log(`Connected to MySQL Database: ${dbConfig.database} (${isProduction ? 'Production' : 'Development'})`);

        try {
            // Verify data migration
            const [[userCount]] = await conn.query('SELECT COUNT(*) as count FROM users');
            console.log(`Data Verification: Found ${userCount.count} users in the database.`);
        } catch (err) {
            console.warn('Data Verification Warning: "users" table might be missing or empty.', err.message);
        }

        conn.release();
    })
    .catch((err) => {
        console.error('Database connection failed:', err.message);
        console.log('Check your environment variables and ensured the database service is running.');
    });

module.exports = dbPromise;
