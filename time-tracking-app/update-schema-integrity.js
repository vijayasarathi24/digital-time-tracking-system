const db = require('./backend/db');
async function updateSchema() {
    console.log('🔄 Updating schema for Time Integrity...');
    try {
        const [columns] = await db.query("DESCRIBE time_logs");
        const columnNames = columns.map(c => c.Field);

        if (!columnNames.includes('initial_start_time')) {
            console.log('➕ Adding column: initial_start_time');
            await db.query(`ALTER TABLE time_logs ADD COLUMN initial_start_time DATETIME AFTER user_id`);
            // Initialize existing records with their start_time
            await db.query(`UPDATE time_logs SET initial_start_time = COALESCE(start_time, created_at)`);
        } else {
            console.log('✅ Column initial_start_time already exists.');
        }

        console.log('🎉 Schema update complete!');
    } catch (err) {
        console.error('❌ Schema update failed:', err);
    } finally {
        process.exit();
    }
}
updateSchema();
