const db = require('./backend/db');

async function revert() {
    console.log('Reverting to separate but linked admins and users tables...');
    const conn = await db.getConnection();

    try {
        await conn.beginTransaction();

        // 1. Create Admins table
        console.log('Creating admins table...');
        await conn.execute(`
            CREATE TABLE IF NOT EXISTS admins (
                id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(255) NOT NULL UNIQUE,
                password_hash VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // 2. Create Users table (with admin_link)
        console.log('Creating users table with admin_id link...');
        await conn.execute(`
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                admin_id INT NULL,
                name VARCHAR(255) NOT NULL,
                email VARCHAR(255) NOT NULL UNIQUE,
                username VARCHAR(255) NOT NULL UNIQUE,
                password_hash VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE SET NULL
            )
        `);

        // 3. Migrate data back
        console.log('Migrating data from accounts...');

        // Migrate Admins
        await conn.execute(`
            INSERT IGNORE INTO admins (id, username, password_hash, created_at)
            SELECT id, username, password_hash, created_at FROM accounts WHERE role = 'admin'
        `);

        // Migrate Users
        await conn.execute(`
            INSERT IGNORE INTO users (id, name, email, username, password_hash, created_at)
            SELECT id, name, email, username, password_hash, created_at FROM accounts WHERE role = 'user'
        `);

        // 4. Update Time Logs
        console.log('Updating time_logs to support both users and admins...');

        // Drop existing FK to accounts
        try {
            const [fk] = await conn.execute(`
                SELECT CONSTRAINT_NAME 
                FROM information_schema.KEY_COLUMN_USAGE 
                WHERE TABLE_NAME = 'time_logs' AND TABLE_SCHEMA = DATABASE() AND COLUMN_NAME = 'user_id'
            `);
            if (fk.length > 0) {
                await conn.execute(`ALTER TABLE time_logs DROP FOREIGN KEY ${fk[0].CONSTRAINT_NAME}`);
            }
        } catch (e) {
            console.log('No FK to drop or error dropping it:', e.message);
        }

        // We'll keep user_id for users and add admin_id for admins
        try {
            await conn.execute('ALTER TABLE time_logs ADD COLUMN admin_id INT NULL AFTER user_id');
        } catch (e) {
            console.log('admin_id column might already exist:', e.message);
        }

        // Update user_id to NULL if it was actually an admin_id (based on the previous unified IDs)
        // Since IDs were preserved, this is tricky. 
        // Let's assume user_id in time_logs should now only reference users(id).
        // If an admin (role='admin' in accounts) had logs, we move their user_id to admin_id.
        console.log('Correcting log ownership...');
        const [adminLogs] = await conn.execute('SELECT id FROM accounts WHERE role = \'admin\'');
        for (const admin of adminLogs) {
            await conn.execute('UPDATE time_logs SET admin_id = user_id, user_id = NULL WHERE user_id = ?', [admin.id]);
        }

        // Add FKs back
        await conn.execute(`
            ALTER TABLE time_logs 
            ADD CONSTRAINT fk_time_logs_user 
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        `);
        await conn.execute(`
            ALTER TABLE time_logs 
            ADD CONSTRAINT fk_time_logs_admin 
            FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE CASCADE
        `);

        console.log('Reversion and linking successful!');
        // Note: We leave 'accounts' table for now to be safe, but it's no longer used.
        await conn.commit();
    } catch (err) {
        await conn.rollback();
        console.error('Reversion failed:', err);
    } finally {
        conn.release();
        process.exit();
    }
}

revert();
