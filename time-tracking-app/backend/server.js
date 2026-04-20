const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const express = require('express');
const session = require('express-session');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
const isProduction = process.env.NODE_ENV === 'production';
const allowedOrigins = [
    'http://localhost:3001',
    'https://digital-time-tracking-system.onrender.com'
];

if (process.env.FRONTEND_URL) {
    allowedOrigins.push(process.env.FRONTEND_URL);
}

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps, curl, or same-origin)
        if (!origin || allowedOrigins.includes(origin) || (!isProduction && origin.includes('localhost'))) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Path to frontend assets
const FRONTEND_PATH = path.join(__dirname, '../frontend');
app.use(express.static(FRONTEND_PATH));

// Session Setup
app.use(session({
    secret: process.env.SESSION_SECRET || 'secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: isProduction, // Secure in production (HTTPS)
        sameSite: isProduction ? 'none' : 'lax', // Needed for cross-site cookies in prod
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    },
    proxy: isProduction // Required for secure cookies behind a proxy like Render
}));

// API Routes
app.use('/auth', require('./routes/auth.routes'));
app.use('/admin', require('./routes/admin.routes'));
app.use('/user', require('./routes/user.routes'));

// Specific HTML Routes for client-side navigation
app.get('/login', (req, res) => res.sendFile(path.join(FRONTEND_PATH, 'index.html')));
app.get('/register', (req, res) => res.sendFile(path.join(FRONTEND_PATH, 'register.html')));
app.get('/administrator', (req, res) => res.sendFile(path.join(FRONTEND_PATH, 'admin-dashboard.html')));
app.get('/dashboard', (req, res) => res.sendFile(path.join(FRONTEND_PATH, 'user-dashboard.html')));
app.get('/report', (req, res) => res.sendFile(path.join(FRONTEND_PATH, 'user-report.html')));

// Default route (root) serves index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(FRONTEND_PATH, 'index.html'));
});

// Server Startup
const db = require('./db');

const startServer = () => {
    app.listen(PORT, () => {
        console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode`);
        console.log(`Local Access: http://localhost:${PORT}`);
    });
};

db.getConnection()
    .then((connection) => {
        connection.release();
        console.log('Database connected successfully.');
        startServer();
    })
    .catch((err) => {
        console.error('Database connection failed:', err.message);
        console.log('Starting server in offline mode (without database)...');
        startServer();
    });
