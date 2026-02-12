const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const db = require('./backend/db');

async function verifyIntegrity() {
    console.log('🧪 Starting Integrity Test...');
    try {
        // Query a user to test session onset
        const [users] = await db.query("SELECT id FROM users LIMIT 1");
        if (users.length === 0) throw new Error("No users found to test with");
        const userId = users[0].id;

        // 1. Clear existing for clean test
        await db.execute("DELETE FROM time_logs WHERE project_name = 'TEST_INTEGRITY'");

        // 2. Start Timer
        console.log('   -> Starting TEST_INTEGRITY session');
        await db.execute(
            `INSERT INTO time_logs 
             (user_id, initial_start_time, start_time, work_description, project_name, project_description, estimated_seconds, total_seconds, log_date, completion_status) 
             VALUES (?, NOW(), NOW(), 'Integrity Test', 'TEST_INTEGRITY', 'Verification', 3600, 0, CURDATE(), 'in_progress')`,
            [userId]
        );

        // 3. Wait 3 seconds
        console.log('   -> Waiting 3s...');
        await new Promise(r => setTimeout(r, 3000));

        // 4. Check "Live" Reports Query
        console.log('   -> Checking Reports Logic...');
        const [logs] = await db.query(`
            SELECT *, 
            (total_seconds + CASE WHEN end_time IS NULL AND start_time IS NOT NULL THEN TIMESTAMPDIFF(SECOND, start_time, NOW()) ELSE 0 END) as live_total_seconds
            FROM time_logs 
            WHERE project_name = 'TEST_INTEGRITY'`);

        const log = logs[0];
        console.log('   -> Result Status:', {
            initial_start_time: log.initial_start_time,
            live_total_seconds: log.live_total_seconds,
            isCorrect: log.live_total_seconds >= 3
        });

        if (log.live_total_seconds < 3) throw new Error('Live duration calculation failed');
        console.log('✅ Integrity Check Passed! Back-end logic is accurate.');

    } catch (err) {
        console.error('❌ Check Failed:', err.message);
    } finally {
        process.exit();
    }
}
verifyIntegrity();
