const mysql = require('mysql2');

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'time_tracking_db',
    port: parseInt(process.env.DB_PORT) || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    // Add SSL support for remote databases (common for managed services)
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : null
});

module.exports = pool.promise();
