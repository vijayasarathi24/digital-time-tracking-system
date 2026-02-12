const db = require('../db');
const bcrypt = require('bcrypt');

exports.adminLogin = async (req, res) => {
    const { username, password } = req.body;
    try {
        console.log('Login attempt for:', username);
        const [admins] = await db.execute('SELECT * FROM admins WHERE username = ?', [username]);
        if (admins.length === 0) {
            console.log('User not found');
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        const admin = admins[0];
        const match = await bcrypt.compare(password, admin.password_hash);
        console.log('Password match:', match);
        if (!match) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        req.session.user = { id: admin.id, role: 'admin', username: admin.username };
        res.json({ message: 'Login successful', role: 'admin' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};

exports.userLogin = async (req, res) => {
    const { username, password } = req.body;
    try {
        const [users] = await db.execute('SELECT * FROM users WHERE username = ?', [username]);
        if (users.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        const user = users[0];
        const match = await bcrypt.compare(password, user.password_hash);
        if (!match) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        req.session.user = { id: user.id, role: 'user', username: user.username, name: user.name };
        res.json({ message: 'Login successful', role: 'user' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};

exports.login = async (req, res) => {
    const { username, password } = req.body;
    try {
        // 1. Check Admins
        const [admins] = await db.execute('SELECT * FROM admins WHERE username = ?', [username]);
        if (admins.length > 0) {
            const admin = admins[0];
            const match = await bcrypt.compare(password, admin.password_hash);
            if (match) {
                req.session.user = { id: admin.id, role: 'admin', username: admin.username };
                return res.json({ message: 'Login successful', role: 'admin' });
            }
        }

        // 2. Check Users
        const [users] = await db.execute('SELECT * FROM users WHERE username = ?', [username]);
        if (users.length > 0) {
            const user = users[0];
            const match = await bcrypt.compare(password, user.password_hash);
            if (match) {
                req.session.user = { id: user.id, role: 'user', username: user.username, name: user.name };
                return res.json({ message: 'Login successful', role: 'user' });
            }
        }

        res.status(401).json({ error: 'Invalid username or password' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};

exports.logout = (req, res) => {
    req.session.destroy(err => {
        if (err) return res.status(500).json({ error: 'Logout failed' });
        res.clearCookie('connect.sid'); // Default cookie name for express-session
        res.json({ message: 'Logged out successfully' });
    });
};

exports.getSession = (req, res) => {
    if (req.session.user) {
        res.json({ user: req.session.user });
    } else {
        res.status(401).json({ error: 'Not authenticated' });
    }
};
