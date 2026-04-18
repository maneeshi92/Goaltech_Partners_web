const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkData() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT || 3306,
        user: process.env.DB_USER,
        password: process.env.DB_PASS,
        database: process.env.DB_NAME,
        ssl: process.env.DB_HOST && process.env.DB_HOST.includes('tidbcloud.com') ? { minVersion: 'TLSv1.2', rejectUnauthorized: true } : undefined
    });

    try {
        console.log('--- COMPLETE BUSINESS SUMMARY ---');
        const [summary] = await connection.execute(`
            SELECT 
                b.id as biz_id,
                b.name as business_name,
                u.name as owner_name,
                u.email as owner_email,
                GROUP_CONCAT(f.type SEPARATOR ', ') as facility_types,
                COUNT(f.id) as total_facilities,
                b.created_at
            FROM businesses b
            JOIN users u ON b.user_id = u.id
            LEFT JOIN facilities f ON b.id = f.business_id
            GROUP BY b.id, u.name, u.email, b.name, b.created_at
        `);
        console.table(summary);

        console.log('\n--- DETAILED FACILITIES ---');
        const [facilities] = await connection.execute('SELECT business_id, type, label, price, capacity FROM facilities');
        console.table(facilities);

    } catch (err) {
        console.error(err);
    } finally {
        await connection.end();
    }
}

checkData();
