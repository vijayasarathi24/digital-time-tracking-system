const mysql = require('mysql2');

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'time_tracking_db',
    port: parseInt(process.env.DB_PORT) || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Test connection on startup
pool.getConnection((err, conn) => {
    if (err) {
        console.error('Database connection failed at initialization:', err.message);
    } else {
        console.log('Connected to MySQL database:', process.env.DB_NAME);
        conn.release();
    }
});

module.exports = pool.promise();
