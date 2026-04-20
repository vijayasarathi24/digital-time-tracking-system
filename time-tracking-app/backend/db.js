const mysql = require('mysql2');

const isProduction = process.env.NODE_ENV === 'production';

const pool = mysql.createPool({
    host: process.env.DB_HOST || process.env.MYSQLHOST || 'localhost',
    user: process.env.DB_USER || process.env.MYSQLUSER || 'root',
    password: process.env.DB_PASSWORD || process.env.MYSQLPASSWORD || '',
    database: process.env.DB_NAME || process.env.MYSQLDATABASE || 'time_tracking_db',
    port: parseInt(process.env.DB_PORT || process.env.MYSQLPORT) || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    ssl: isProduction ? { rejectUnauthorized: false } : null
});

// Test connection on startup
pool.getConnection((err, conn) => {
    if (err) {
        console.error('Database connection failed at initialization:', err.message);
    } else {
        console.log('Connected to MySQL database:', process.env.DB_NAME || process.env.MYSQLDATABASE || 'time_tracking_db');
        conn.release();
    }
});

module.exports = pool.promise();
