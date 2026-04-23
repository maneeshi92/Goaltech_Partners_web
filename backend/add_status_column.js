const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function addStatusColumn() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT || 3306,
        user: process.env.DB_USER,
        password: process.env.DB_PASS,
        database: process.env.DB_NAME,
        ssl: process.env.DB_HOST && process.env.DB_HOST.includes('tidbcloud.com') ? { minVersion: 'TLSv1.2', rejectUnauthorized: true } : undefined,
        multipleStatements: true
    });

    try {
        console.log('Adding status column to facilities table...');
        
        try {
            await connection.query("ALTER TABLE facilities ADD COLUMN status ENUM('active', 'inactive') DEFAULT 'active' AFTER mode");
            console.log('Added status column');
        } catch (e) {
            if (e.code === 'ER_DUP_FIELDNAME') console.log('status column already exists');
            else throw e;
        }

        console.log('Database migration complete!');
    } catch (e) {
        console.error('Migration failed:', e);
    } finally {
        connection.end();
    }
}
addStatusColumn();
