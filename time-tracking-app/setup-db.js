const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function setupDatabase() {
    console.log('🔄 Setting up Database...');

    // Connect without database selected first
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        port: process.env.DB_PORT
    });

    try {
        // Create DB if not exists
        await connection.query(`CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME}\`;`);
        console.log(`✅ Database '${process.env.DB_NAME}' checked/created.`);

        // Use DB
        await connection.changeUser({ database: process.env.DB_NAME });

        // Read Schema
        const schemaPath = path.join(__dirname, 'database/schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf8');

        // Split statements (simple split by semicolon, careful with stored procedures if any)
        // Adjust for comments and empty lines
        const statements = schema
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0);

        for (const statement of statements) {
            // Skip USE command since we already selected DB, but it's harmless usually
            try {
                await connection.query(statement);
            } catch (err) {
                // Ignore "Table already exists" or "Duplicate entry" for re-runs
                if (err.code !== 'ER_TABLE_EXISTS_ERROR' && err.code !== 'ER_DUP_ENTRY') {
                    console.error('⚠️ Error executing statement:', statement.substring(0, 50) + '...', err.message);
                }
            }
        }
        console.log('✅ Schema imported successfully!');

    } catch (err) {
        console.error('❌ Setup Failed:', err);
    } finally {
        await connection.end();
    }
}

setupDatabase();
