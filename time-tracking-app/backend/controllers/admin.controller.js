const db = require('../db');
const bcrypt = require('bcrypt');

// Dashboard Stats
exports.getDashboardStats = async (req, res) => {
    try {
        const [userCount] = await db.execute('SELECT COUNT(*) as count FROM users');
        const [totalSeconds] = await db.execute('SELECT SUM(total_seconds) as total FROM time_logs');

        res.json({
            totalUsers: userCount[0].count,
            totalHours: (totalSeconds[0].total || 0) / 3600
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};

// User CRUD
exports.getAllUsers = async (req, res) => {
    try {
        const [users] = await db.execute('SELECT id, name, email, username, admin_id, created_at FROM users');
        res.json(users);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};

exports.getUserById = async (req, res) => {
    try {
        const [users] = await db.execute('SELECT id, name, email, username, admin_id, created_at FROM users WHERE id = ?', [req.params.id]);
        if (users.length === 0) return res.status(404).json({ error: 'User not found' });
        res.json(users[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};

exports.createUser = async (req, res) => {
    const { name, email, username, password } = req.body;
    const adminId = req.session.user.id; // Get current admin ID from session
    try {
        const hash = await bcrypt.hash(password, 10);
        await db.execute('INSERT INTO users (name, email, username, password_hash, admin_id) VALUES (?, ?, ?, ?, ?)', [name, email, username, hash, adminId]);
        res.status(201).json({ message: 'User created successfully' });
    } catch (err) {
        console.error(err);
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: 'Username or Email already exists' });
        }
        res.status(500).json({ error: 'Server error' });
    }
};

exports.updateUser = async (req, res) => {
    const { name, email, username, admin_id } = req.body;
    try {
        await db.execute('UPDATE users SET name = ?, email = ?, username = ?, admin_id = ? WHERE id = ?', [name, email, username, admin_id || null, req.params.id]);
        res.json({ message: 'User updated successfully' });
    } catch (err) {
        console.error(err);
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: 'Username or Email already exists' });
        }
        res.status(500).json({ error: 'Server error' });
    }
};

exports.deleteUser = async (req, res) => {
    try {
        await db.execute('DELETE FROM users WHERE id = ?', [req.params.id]);
        res.json({ message: 'User deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};

exports.resetUserPassword = async (req, res) => {
    const { newPassword } = req.body;
    try {
        const hash = await bcrypt.hash(newPassword, 10);
        await db.execute('UPDATE users SET password_hash = ? WHERE id = ?', [hash, req.params.id]);
        res.json({ message: 'Password reset successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};

exports.changePassword = async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const adminId = req.session.user.id;
    try {
        const [admins] = await db.execute('SELECT * FROM admins WHERE id = ?', [adminId]);
        const admin = admins[0];
        const match = await bcrypt.compare(currentPassword, admin.password_hash);
        if (!match) return res.status(401).json({ error: 'Incorrect current password' });

        const hash = await bcrypt.hash(newPassword, 10);
        await db.execute('UPDATE admins SET password_hash = ? WHERE id = ?', [hash, adminId]);
        res.json({ message: 'Password changed successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};

exports.getReports = async (req, res) => {
    const { filter } = req.query;
    let timeCondition = '1=1';

    if (filter === 'day') {
        timeCondition = 'DATE(log_date) = CURDATE()';
    } else if (filter === 'week') {
        timeCondition = 'log_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)';
    } else if (filter === 'month') {
        timeCondition = 'log_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)';
    }

    const query = `
        SELECT u.id, u.name, u.username, u.admin_id,
        COALESCE(SUM(t.total_seconds), 0) as total_seconds 
        FROM users u 
        LEFT JOIN time_logs t ON u.id = t.user_id AND ${timeCondition}
        GROUP BY u.id
    `;

    try {
        const [rows] = await db.execute(query);
        const reports = rows.map(row => ({
            ...row,
            total_hours: (row.total_seconds / 3600).toFixed(2)
        }));
        res.json(reports);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};
