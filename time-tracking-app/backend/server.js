const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const express = require('express');
const session = require('express-session');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
const allowedOrigins = ['http://localhost:3001'];
if (process.env.FRONTEND_URL) {
    allowedOrigins.push(process.env.FRONTEND_URL);
}

app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
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

// Session Setup (Local Memory Store for simplicity)
app.use(session({
    secret: process.env.SESSION_SECRET || 'secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: false, // Localhost is not https
        httpOnly: true
    }
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

db.getConnection()
    .then((connection) => {
        connection.release();
        app.listen(PORT, () => {
            console.log(`Server running at http://localhost:${PORT}`);
        });
    })
    .catch((err) => {
        console.error('Database connection failed:', err.message);
        console.log('Server continuing without database...');
    });
