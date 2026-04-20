const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const express = require('express');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const cors = require('cors');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.set('trust proxy', 1);
app.use(cors({ 
    origin: process.env.FRONTEND_URL || 'http://localhost:3000', 
    credentials: true 
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../frontend')));

// Session Setup
const sessionStore = new MySQLStore({}, db);

app.use(session({
    key: 'session_cookie_name',
    secret: process.env.SESSION_SECRET || 'your-default-secret',
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        maxAge: 1000 * 60 * 60 * 24 // 1 day
    }
}));

// Routes
app.use('/auth', require('./routes/auth.routes'));
app.use('/admin', require('./routes/admin.routes'));
app.use('/user', require('./routes/user.routes'));

// Health Check for Render
app.get('/health', (req, res) => {
    res.status(200).send('OK');
});

// --- Clean URL Routing ---
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/login.html'));
});

app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/register.html'));
});

app.get('/administrator', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/admin-dashboard.html'));
});

app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/user-dashboard.html'));
});

app.get('/report', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/user-report.html'));
});

// Middleware to remove .html from URLs
app.use((req, res, next) => {
    if (req.path.endsWith('.html')) {
        const newPath = req.path.slice(0, -5);
        return res.redirect(301, newPath);
    }
    next();
});

// Default route (root) serves Login page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/login.html'));
});

// --- Server Startup ---

db.getConnection()
    .then((connection) => {
        connection.release();
        app.listen(PORT, () => {
            console.log(`Server running at http://localhost:${PORT}`);
        });
    })
    .catch((err) => {
        console.error('❌ Database connection failed!');
        console.error('Error details:', err.message);
        console.error('Check your environment variables: DB_HOST, DB_USER, DB_PASSWORD, DB_NAME, DB_PORT');
        process.exit(1);
    });

process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

