const db = require('../db');
const bcrypt = require('bcrypt');

exports.adminLogin = async (req, res) => {
    const { username, password } = req.body;
    try {
        const [admins] = await db.execute('SELECT * FROM admins WHERE username = ?', [username]);
        if (admins.length === 0) {
            return res.status(401).json({ error: 'Invalid admin credentials' });
        }
        const admin = admins[0];
        const match = await bcrypt.compare(password, admin.password_hash);
        if (!match) {
            return res.status(401).json({ error: 'Invalid admin credentials' });
        }
        req.session.user = { id: admin.id, role: 'admin', username: admin.username };
        res.json({ message: 'Admin login successful', role: 'admin' });
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
            return res.status(401).json({ error: 'Invalid user credentials' });
        }
        const user = users[0];
        const match = await bcrypt.compare(password, user.pass_word);
        if (!match) {
            return res.status(401).json({ error: 'Invalid user credentials' });
        }
        // Explicitly set role to 'user'
        req.session.user = { id: user.id, role: 'user', username: user.username, name: user.name };
        res.json({ message: 'User login successful', role: 'user' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};

// Unified login deprecated in favor of separate endpoints

exports.register = async (req, res) => {
    const { name, email, username, password } = req.body;
    try {
        // Check if user already exists
        const [existing] = await db.execute('SELECT * FROM users WHERE username = ? OR email = ?', [username, email]);
        if (existing.length > 0) {
            return res.status(400).json({ error: 'Username or email already exists' });
        }

        // Hash password
        const passwordHash = await bcrypt.hash(password, 10);

        // Get default admin (id=1)
        const [admins] = await db.execute('SELECT id FROM admins LIMIT 1');
        const adminId = admins.length > 0 ? admins[0].id : null;

        // Insert new user - use pass_word column
        await db.execute(
            'INSERT INTO users (name, email, username, pass_word, admin_id) VALUES (?, ?, ?, ?, ?)',
            [name, email, username, passwordHash, adminId]
        );

        res.json({ message: 'Registration successful' });
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
