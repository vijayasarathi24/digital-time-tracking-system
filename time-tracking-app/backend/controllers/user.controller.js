const db = require('../db');

/**
 * START TIMER
 * Handles both General Work and Project Initialization.
 * Ensures only ONE active session exists at a time.
 */
exports.startTimer = async (req, res) => {
    const sessionUser = req.session.user;
    const userId = sessionUser.id;
    const { work_description, project_name, project_description, estimated_seconds } = req.body;
    const isProject = !!project_name;

    try {
        const column = sessionUser.role === 'admin' ? 'admin_id' : 'user_id';
        
        // Validation
        if (isProject) {
            if (!project_name || !project_description || !estimated_seconds) {
                return res.status(400).json({ error: 'Project name, description, and estimated time are all required.' });
            }
        } else {
            if (!work_description || !work_description.trim()) {
                return res.status(400).json({ error: 'Work description is mandatory.' });
            }
        }

        // Check for active session of the SAME type
        const typeCondition = isProject ? 'project_name IS NOT NULL' : 'project_name IS NULL';
        const [active] = await db.query(`SELECT id FROM time_logs WHERE ${column} = ? AND end_time IS NULL AND ${typeCondition}`, [userId]);
        
        if (active.length > 0) {
            return res.status(400).json({ error: `You already have an active or paused ${isProject ? 'project' : 'work'} session. Please end it before starting a new one.` });
        }

        const query = `INSERT INTO time_logs 
             (initial_start_time, start_time, work_description, project_name, project_description, estimated_seconds, total_seconds, log_date, completion_status, ${column}) 
             VALUES (NOW(), NOW(), ?, ?, ?, ?, 0, CURDATE(), 'in_progress', ?)`;

        const [result] = await db.execute(query, [
            work_description || '',
            project_name || null,
            project_description || null,
            estimated_seconds || 0,
            userId
        ]);

        res.status(201).json({ 
            message: `${isProject ? 'Project' : 'General'} timer started`,
            id: result.insertId
        });
    } catch (err) {
        res.status(500).json({ error: 'Failed to start timer. Internal server error.' });
    }
};

/**
 * PAUSE TIMER
 * Atomic update: calculates elapsed time and nulls start_time.
 */
exports.pauseTimer = async (req, res) => {
    const userId = req.session.user.id;
    const column = req.session.user.role === 'admin' ? 'admin_id' : 'user_id';
    const { type } = req.body;
    const isProject = type === 'project';
    const typeCondition = isProject ? 'project_name IS NOT NULL' : 'project_name IS NULL';

    try {
        const [active] = await db.query(
            `SELECT id, start_time FROM time_logs WHERE ${column} = ? AND end_time IS NULL AND start_time IS NOT NULL AND ${typeCondition}`, 
            [userId]
        );
        
        if (active.length === 0) {
            return res.status(400).json({ error: `No running ${type || 'timer'} found to pause.` });
        }

        const logId = active[0].id;
        await db.execute(
            `UPDATE time_logs 
             SET total_seconds = COALESCE(total_seconds, 0) + TIMESTAMPDIFF(SECOND, start_time, NOW()), 
                 start_time = NULL 
             WHERE id = ?`,
            [logId]
        );

        res.json({ message: 'Timer paused successfully' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to pause timer.' });
    }
};

/**
 * RESUME TIMER
 * Sets start_time to NOW().
 */
exports.resumeTimer = async (req, res) => {
    const userId = req.session.user.id;
    const column = req.session.user.role === 'admin' ? 'admin_id' : 'user_id';
    const { type } = req.body;
    const isProject = type === 'project';
    const typeCondition = isProject ? 'project_name IS NOT NULL' : 'project_name IS NULL';

    try {
        const [active] = await db.query(
            `SELECT id FROM time_logs WHERE ${column} = ? AND end_time IS NULL AND start_time IS NULL AND ${typeCondition}`, 
            [userId]
        );
        
        if (active.length === 0) {
            return res.status(400).json({ error: `No paused ${type || 'timer'} found to resume.` });
        }

        await db.execute('UPDATE time_logs SET start_time = NOW() WHERE id = ?', [active[0].id]);
        res.json({ message: 'Timer resumed successfully' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to resume timer.' });
    }
};

/**
 * STOP TIMER
 * Atomic update: finalizes total_seconds and end_time.
 */
exports.stopTimer = async (req, res) => {
    const userId = req.session.user.id;
    const column = req.session.user.role === 'admin' ? 'admin_id' : 'user_id';
    const { work_description, completion_status, type } = req.body;
    const isProject = type === 'project';
    const typeCondition = isProject ? 'project_name IS NOT NULL' : 'project_name IS NULL';

    try {
        const [active] = await db.query(`SELECT * FROM time_logs WHERE ${column} = ? AND end_time IS NULL AND ${typeCondition}`, [userId]);
        if (active.length === 0) {
            return res.status(400).json({ error: `No active ${type || 'timer'} found to stop.` });
        }

        const log = active[0];
        const status = completion_status || 'finished';
        const finalDesc = (work_description && work_description.trim()) ? work_description : (log.work_description || '');

        // Calculation in JS for maximum reliability across different MySQL versions/configurations
        const now = new Date();
        let sessionSeconds = 0;
        if (log.start_time) {
            sessionSeconds = Math.floor((now - new Date(log.start_time)) / 1000);
        }
        const totalSeconds = (log.total_seconds || 0) + Math.max(0, sessionSeconds);

        const query = `
            UPDATE time_logs 
            SET total_seconds = ?,
                end_time = NOW(),
                work_description = ?,
                completion_status = ?,
                start_time = NULL
            WHERE id = ?`;

        await db.query(query, [totalSeconds, finalDesc, status, log.id]);
        res.json({ message: 'Timer stopped and saved successfully', status, success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to stop timer. Data persistence error.' });
    }
};

/**
 * GET TIMER STATUS
 * Used for syncing UI state on page load/poll.
 */
exports.getTimerStatus = async (req, res) => {
    const userId = req.session.user.id;
    const column = req.session.user.role === 'admin' ? 'admin_id' : 'user_id';

    try {
        // Run auto-stop check before status check
        await checkAndAutoStopTimers(userId, column);

        const [activeLogs] = await db.query(`SELECT * FROM time_logs WHERE ${column} = ? AND end_time IS NULL`, [userId]);
        
        const response = {
            general: null,
            project: null
        };

        activeLogs.forEach(log => {
            const session = {
                active: true,
                id: log.id,
                workDescription: log.work_description,
                projectName: log.project_name,
                projectDescription: log.project_description,
                estimatedSeconds: log.estimated_seconds,
                totalSeconds: log.total_seconds || 0,
                isRunning: !!log.start_time,
                startTime: log.start_time,
                completionStatus: log.completion_status
            };

            if (log.project_name) response.project = session;
            else response.general = session;
        });

        res.json(response);
    } catch (err) {
        res.status(500).json({ error: 'Failed to sync timer status.' });
    }
};

/**
 * ANALYTICS & REPORTS
 */
exports.getReports = async (req, res) => {
    const sessionUser = req.session.user;
    let targetUserId = sessionUser.id;
    if (sessionUser.role === 'admin' && req.query.userId) targetUserId = parseInt(req.query.userId);

    const { filter } = req.query;
    let timeCondition = '1=1';
    if (filter === 'day') timeCondition = 'DATE(log_date) = CURDATE()';
    else if (filter === 'week') timeCondition = 'log_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)';
    else if (filter === 'month') timeCondition = 'log_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)';

    try {
        const column = (sessionUser.role === 'admin' && !req.query.userId) ? 'admin_id' : 'user_id';
        await checkAndAutoStopTimers(targetUserId, column);

        const [logs] = await db.query(`
            SELECT *, 
            (total_seconds + CASE WHEN end_time IS NULL AND start_time IS NOT NULL THEN TIMESTAMPDIFF(SECOND, start_time, NOW()) ELSE 0 END) as live_total_seconds
            FROM time_logs 
            WHERE ${column} = ? AND ${timeCondition} 
            ORDER BY created_at DESC`, [targetUserId]);

        const totalSeconds = logs.reduce((acc, log) => acc + (log.live_total_seconds || log.total_seconds || 0), 0);
        res.json({ logs, totalHours: (totalSeconds / 3600).toFixed(2), totalSeconds });
    } catch (err) {
        res.status(500).json({ error: 'Failed to load reports.' });
    }
};

exports.getReportsSummary = async (req, res) => {
    const sessionUser = req.session.user;
    let targetId = sessionUser.id;
    if (sessionUser.role === 'admin' && req.query.userId) targetId = parseInt(req.query.userId);

    const { filter } = req.query;
    let timeCondition = '1=1';
    if (filter === 'today') timeCondition = 'DATE(log_date) = CURDATE()';
    else if (filter === 'week') timeCondition = 'log_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)';
    else if (filter === 'month') timeCondition = 'log_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)';

    try {
        const column = (sessionUser.role === 'admin' && !req.query.userId) ? 'admin_id' : 'user_id';
        const [logs] = await db.query(`SELECT total_seconds, log_date FROM time_logs WHERE ${column} = ? AND ${timeCondition}`, [targetId]);
        
        const totalSec = logs.reduce((s, l) => s + (l.total_seconds || 0), 0);
        const uniqueDays = new Set(logs.map(l => new Date(l.log_date).toDateString())).size;

        res.json({
            totalHours: (totalSec / 3600).toFixed(2),
            totalSessions: logs.length,
            avgDailyHours: uniqueDays > 0 ? (totalSec / (3600 * uniqueDays)).toFixed(2) : '0.00'
        });
    } catch (err) {
        console.error("Summary Error:", err);
        res.status(500).json({ error: 'Failed to load summary.' });
    }
};

exports.getReportsMetrics = async (req, res) => {
    const userId = req.session.user.id;
    const column = req.session.user.role === 'admin' ? 'admin_id' : 'user_id';
    try {
        const [logs] = await db.query(
            `SELECT log_date, total_seconds, project_name FROM time_logs WHERE ${column} = ? ORDER BY log_date ASC`, 
            [userId]
        );
        
        const projects = {};
        logs.forEach(l => {
            const name = l.project_name || 'General';
            projects[name] = (projects[name] || 0) + (l.total_seconds || 0);
        });

        res.json({
            projects: {
                labels: Object.keys(projects),
                data: Object.values(projects).map(s => (s/3600).toFixed(2))
            }
        });
    } catch (err) {
        res.status(500).json({ error: 'Failed' });
    }
};

exports.getTodayAverage = async (req, res) => {
    const userId = req.session.user.id;
    const column = req.session.user.role === 'admin' ? 'admin_id' : 'user_id';
    try {
        const [resArr] = await db.query(
            `SELECT AVG(total_seconds) as avgS FROM time_logs WHERE ${column} = ? AND log_date = CURDATE() AND end_time IS NOT NULL`, 
            [userId]
        );
        const avg = Math.round(resArr[0].avgS || 0);
        res.json({ avgSeconds: avg, formatted: formatTime(avg) });
    } catch (err) {
        res.status(500).json({ error: 'Error' });
    }
};

exports.getRecentActivities = async (req, res) => {
    const userId = req.session.user.id;
    const column = req.session.user.role === 'admin' ? 'admin_id' : 'user_id';
    try {
        const [logs] = await db.query(`
            SELECT id, work_description, project_name, total_seconds, completion_status, created_at, initial_start_time, start_time, end_time
            FROM time_logs 
            WHERE ${column} = ?
            ORDER BY created_at DESC
            LIMIT 5`, [userId]);
        
        res.json(logs.map(l => ({
            ...l,
            task: (l.work_description && l.work_description.trim()) ? l.work_description : (l.project_name || 'Work'),
            time_spent: formatTime(l.total_seconds || 0),
            start_time: l.start_time,
            end_time: l.end_time
        })));
    } catch (err) {
        res.status(500).json({ error: 'Error' });
    }
};

exports.getProfile = async (req, res) => {
    try {
        const [users] = await db.execute('SELECT id, name, username, email FROM users WHERE id = ?', [req.session.user.id]);
        res.json(users[0]);
    } catch (err) {
        res.status(500).json({ error: 'Error' });
    }
};

// --- Helpers ---
const checkAndAutoStopTimers = async (userId, column) => {
    try {
        // 1. Check for 5 PM cut-off or past date logs
        const [active] = await db.query(
            `SELECT * FROM time_logs WHERE ${column} = ? AND end_time IS NULL AND (CURTIME() >= '17:00:00' OR DATE(log_date) < CURDATE())`,
            [userId]
        );
        for (const log of active) {
            const end = `${log.log_date.toISOString().split('T')[0]} 17:00:00`;
            await db.execute(
                `UPDATE time_logs SET total_seconds = total_seconds + CASE WHEN start_time IS NOT NULL THEN GREATEST(0, TIMESTAMPDIFF(SECOND, start_time, ?)) ELSE 0 END, end_time = ?, completion_status = 'auto_ended', start_time = NULL WHERE id = ?`,
                [end, end, log.id]
            );
        }

        // 2. Check for expired project sessions (countdown reaching 0)
        const [expiredProjects] = await db.query(
            `SELECT * FROM time_logs 
             WHERE ${column} = ? AND end_time IS NULL AND project_name IS NOT NULL 
             AND (total_seconds + CASE WHEN start_time IS NOT NULL THEN TIMESTAMPDIFF(SECOND, start_time, NOW()) ELSE 0 END) >= estimated_seconds`,
            [userId]
        );
        
        for (const proj of expiredProjects) {
            await db.execute(
                `UPDATE time_logs 
                 SET total_seconds = estimated_seconds, 
                     end_time = NOW(), 
                     completion_status = 'not_completed', 
                     start_time = NULL 
                 WHERE id = ?`,
                [proj.id]
            );
        }
    } catch (err) { console.error("Auto-stop error:", err); }
};

function formatTime(s) {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}
