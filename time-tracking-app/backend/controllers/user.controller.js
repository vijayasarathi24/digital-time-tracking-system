const db = require('../db');

// Timer Logic

exports.startTimer = async (req, res) => {
    const sessionUser = req.session.user;
    const userId = sessionUser.id;
    const { work_description, project_name, project_description, estimated_seconds } = req.body;
    const isProject = !!project_name;

    try {
        const column = sessionUser.role === 'admin' ? 'admin_id' : 'user_id';
        let checkQuery = `SELECT * FROM time_logs WHERE ${column} = ? AND end_time IS NULL AND `;
        checkQuery += isProject ? 'project_name IS NOT NULL' : 'project_name IS NULL';

        const [active] = await db.query(checkQuery, [userId]);
        if (active.length > 0) {
            return res.status(400).json({ error: `A ${isProject ? 'project' : 'general'} timer is already active.` });
        }

        const query = `INSERT INTO time_logs 
             (initial_start_time, start_time, work_description, project_name, project_description, estimated_seconds, total_seconds, log_date, completion_status, ${column}) 
             VALUES (NOW(), NOW(), ?, ?, ?, ?, 0, CURDATE(), 'in_progress', ?)`;

        await db.execute(query, [work_description || '', project_name || null, project_description || null, estimated_seconds || 0, userId]);
        res.json({ message: `${isProject ? 'Project' : 'General'} timer started` });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};

exports.pauseTimer = async (req, res) => {
    const sessionUser = req.session.user;
    const userId = sessionUser.id;
    const { isProject } = req.body;
    try {
        const column = sessionUser.role === 'admin' ? 'admin_id' : 'user_id';
        let queryStr = `SELECT * FROM time_logs WHERE ${column} = ? AND end_time IS NULL AND start_time IS NOT NULL AND `;
        queryStr += isProject ? 'project_name IS NOT NULL' : 'project_name IS NULL';

        const [active] = await db.query(queryStr, [userId]);
        if (active.length === 0) {
            return res.status(400).json({ error: `No running ${isProject ? 'project' : 'general'} timer found.` });
        }

        const log = active[0];
        await db.execute(
            `UPDATE time_logs 
             SET total_seconds = total_seconds + TIMESTAMPDIFF(SECOND, start_time, NOW()), 
                 start_time = NULL 
             WHERE id = ?`,
            [log.id]
        );
        res.json({ message: 'Timer paused' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};

exports.resumeTimer = async (req, res) => {
    const sessionUser = req.session.user;
    const userId = sessionUser.id;
    const { isProject } = req.body;
    try {
        const column = sessionUser.role === 'admin' ? 'admin_id' : 'user_id';
        let queryStr = `SELECT * FROM time_logs WHERE ${column} = ? AND end_time IS NULL AND start_time IS NULL AND `;
        queryStr += isProject ? 'project_name IS NOT NULL' : 'project_name IS NULL';

        const [paused] = await db.query(queryStr, [userId]);
        if (paused.length === 0) {
            return res.status(400).json({ error: `No paused ${isProject ? 'project' : 'general'} timer found.` });
        }

        const log = paused[0];
        await db.execute('UPDATE time_logs SET start_time = NOW() WHERE id = ?', [log.id]);
        res.json({ message: 'Timer resumed' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};

exports.stopTimer = async (req, res) => {
    const sessionUser = req.session.user;
    const userId = sessionUser.id;
    const { work_description, completion_status, isProject } = req.body;

    try {
        const column = sessionUser.role === 'admin' ? 'admin_id' : 'user_id';
        let findQuery = `SELECT * FROM time_logs WHERE ${column} = ? AND end_time IS NULL AND `;
        findQuery += isProject ? 'project_name IS NOT NULL' : 'project_name IS NULL';

        const [active] = await db.query(findQuery, [userId]);
        if (active.length === 0) {
            return res.status(400).json({ error: `No active ${isProject ? 'project' : 'general'} timer found.` });
        }

        const log = active[0];
        const status = completion_status || 'finished';
        const workDesc = work_description || null;

        let query = '';
        let params = [];

        if (log.start_time) {
            query = `UPDATE time_logs 
                     SET total_seconds = total_seconds + TIMESTAMPDIFF(SECOND, start_time, NOW()), 
                         end_time = NOW(), 
                         work_description = COALESCE(?, work_description),
                         completion_status = ?
                     WHERE id = ?`;
            params = [workDesc, status, log.id];
        } else {
            query = `UPDATE time_logs 
                     SET end_time = NOW(),
                         work_description = COALESCE(?, work_description),
                         completion_status = ?
                     WHERE id = ?`;
            params = [workDesc, status, log.id];
        }

        await db.execute(query, params);
        res.json({ message: 'Timer stopped', status });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};

exports.getReports = async (req, res) => {
    const sessionUser = req.session.user;
    let targetUserId = sessionUser.id;

    // Admin override: if an admin provides a userId, fetch that user's reports
    if (sessionUser.role === 'admin' && req.query.userId) {
        targetUserId = parseInt(req.query.userId);
    }

    const { filter } = req.query;
    let timeCondition = '1=1';
    if (filter === 'day') {
        timeCondition = 'DATE(log_date) = CURDATE()';
    } else if (filter === 'week') {
        timeCondition = 'log_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)';
    } else if (filter === 'month') {
        timeCondition = 'log_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)';
    }

    try {
        // Fetch target user name for metadata (Lookup in users table)
        const [users] = await db.query('SELECT name FROM users WHERE id = ?', [targetUserId]);
        const targetUserName = users.length > 0 ? users[0].name : (sessionUser.role === 'admin' ? 'Administrator' : 'Unknown User');

        // Calculate total seconds including live time for active sessions
        const column = (sessionUser.role === 'admin' && !req.query.userId) ? 'admin_id' : 'user_id';
        const [logs] = await db.query(`
            SELECT *, 
            (total_seconds + CASE WHEN end_time IS NULL AND start_time IS NOT NULL THEN TIMESTAMPDIFF(SECOND, start_time, NOW()) ELSE 0 END) as live_total_seconds
            FROM time_logs 
            WHERE ${column} = ? AND ${timeCondition} 
            ORDER BY created_at DESC`, [targetUserId]);

        const totalSeconds = logs.reduce((acc, log) => acc + log.live_total_seconds, 0);

        res.json({
            logs,
            totalHours: (totalSeconds / 3600).toFixed(2),
            totalSeconds,
            targetUserName
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};

// Check active timer status on load
exports.getTimerStatus = async (req, res) => {
    const sessionUser = req.session.user;
    const userId = sessionUser.id;
    const column = sessionUser.role === 'admin' ? 'admin_id' : 'user_id';
    try {
        const [activeSessions] = await db.query(`SELECT * FROM time_logs WHERE ${column} = ? AND end_time IS NULL`, [userId]);

        const response = {
            general: { active: false },
            project: { active: false }
        };

        activeSessions.forEach(log => {
            const isRunning = !!log.start_time;
            const sessionData = {
                active: true,
                id: log.id,
                startTime: log.start_time,
                totalSeconds: log.total_seconds,
                isRunning,
                workDescription: log.work_description,
                projectName: log.project_name,
                projectDescription: log.project_description,
                estimatedSeconds: log.estimated_seconds,
                completionStatus: log.completion_status
            };

            if (log.project_name) {
                response.project = sessionData;
            } else {
                response.general = sessionData;
            }
        });

        res.json(response);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};
