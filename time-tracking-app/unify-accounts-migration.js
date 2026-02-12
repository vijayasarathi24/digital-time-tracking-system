const db = require('./backend/db');

async function migrate() {
    console.log('Starting migration to unified accounts table...');
    const conn = await db.getConnection();

    try {
        await conn.beginTransaction();

        // 1. Create accounts table
        console.log('Creating accounts table...');
        await conn.execute(`
            CREATE TABLE IF NOT EXISTS accounts (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                email VARCHAR(255) NOT NULL UNIQUE,
                username VARCHAR(255) NOT NULL UNIQUE,
                password_hash VARCHAR(255) NOT NULL,
                role ENUM('user', 'admin') DEFAULT 'user',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // 2. Migrate Users
        console.log('Migrating users...');
        await conn.execute(`
            INSERT IGNORE INTO accounts (id, name, email, username, password_hash, role, created_at)
            SELECT id, name, email, username, password_hash, 'user', created_at FROM users
        `);

        // 3. Migrate Admins (handling potential username conflicts if any, though unlikely for 'admin')
        console.log('Migrating admins...');
        const [admins] = await conn.execute('SELECT * FROM admins');
        for (const admin of admins) {
            // Check if username exists in accounts (from users)
            const [exists] = await conn.execute('SELECT id FROM accounts WHERE username = ?', [admin.username]);
            if (exists.length > 0) {
                // If conflict, we update role to admin if it's the same person or just skip/update
                await conn.execute('UPDATE accounts SET role = \'admin\' WHERE username = ?', [admin.username]);
            } else {
                await conn.execute(`
                    INSERT INTO accounts (name, email, username, password_hash, role, created_at)
                    VALUES (?, ?, ?, ?, 'admin', ?)
                `, [admin.username, admin.username + '@admin.internal', admin.username, admin.password_hash, admin.created_at]);
            }
        }

        // 4. Update Time Logs Foreign Key
        console.log('Updating time_logs foreign key...');
        // First drop old FK
        try {
            // We need to find the constraint name. Usually it's time_logs_ibfk_1 or similar.
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

        // Add new FK referencing accounts
        await conn.execute(`
            ALTER TABLE time_logs 
            ADD CONSTRAINT fk_time_logs_user 
            FOREIGN KEY (user_id) REFERENCES accounts(id) ON DELETE CASCADE
        `);

        console.log('Migration successful! Tables unified.');
        await conn.commit();
    } catch (err) {
        await conn.rollback();
        console.error('Migration failed:', err);
    } finally {
        conn.release();
        process.exit();
    }
}

migrate();
