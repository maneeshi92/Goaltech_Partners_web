const mysql = require('mysql2/promise');
require('dotenv').config();

async function alterDb() {
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
        console.log('Altering businesses table...');
        await connection.query(`
            ALTER TABLE businesses
            ADD COLUMN status ENUM('active', 'inactive', 'pending', 'rejected') DEFAULT 'pending',
            ADD COLUMN contact_name VARCHAR(100),
            ADD COLUMN contact_phone VARCHAR(20),
            ADD COLUMN gst_vat VARCHAR(100),
            ADD COLUMN registered_address TEXT,
            ADD COLUMN reject_reason TEXT;
        `);
        console.log('Alter success!');
    } catch (e) {
        if (e.code === 'ER_DUP_FIELDNAME') {
            console.log('Columns already exist.');
        } else {
            console.error('Alter failed', e);
        }
    } finally {
        connection.end();
    }
}
alterDb();
