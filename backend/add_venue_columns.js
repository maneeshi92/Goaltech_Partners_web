const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function addVenueColumns() {
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
        console.log('Adding venue columns to facilities table...');
        
        // Add venue column
        try {
            await connection.query('ALTER TABLE facilities ADD COLUMN venue VARCHAR(255)');
            console.log('Added venue column');
        } catch (e) {
            if (e.code === 'ER_DUP_FIELDNAME') console.log('venue column already exists');
            else throw e;
        }

        // Add venue_location column
        try {
            await connection.query('ALTER TABLE facilities ADD COLUMN venue_location VARCHAR(255)');
            console.log('Added venue_location column');
        } catch (e) {
            if (e.code === 'ER_DUP_FIELDNAME') console.log('venue_location column already exists');
            else throw e;
        }

        console.log('Database migration complete!');
    } catch (e) {
        console.error('Migration failed:', e);
    } finally {
        connection.end();
    }
}
addVenueColumns();
