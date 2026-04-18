const mysql = require('mysql2/promise');
require('dotenv').config();

async function migrate() {
    console.log('🚀 Starting GoalTech Database Migration...');

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
        const sql = `
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                email VARCHAR(150) UNIQUE NOT NULL,
                phone VARCHAR(20) NOT NULL,
                password VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS businesses (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                name VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS facilities (
                id INT AUTO_INCREMENT PRIMARY KEY,
                business_id INT NOT NULL,
                type VARCHAR(100) NOT NULL,
                label VARCHAR(255),
                icon VARCHAR(100),
                mode VARCHAR(50),
                hours JSON,
                amenities JSON,
                price DECIMAL(10, 2),
                weekendPrice DECIMAL(10, 2),
                peakPrice DECIMAL(10, 2),
                peakStart TIME,
                peakEnd TIME,
                capacity INT,
                description TEXT,
                phone VARCHAR(20),
                website VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
            );
        `;

        console.log('⏳ Creating tables if they do not exist...');
        await connection.query(sql);
        console.log('✅ Migration completed successfully!');
    } catch (err) {
        console.error('❌ Migration failed!');
        console.error(err);
    } finally {
        await connection.end();
    }
}

migrate();
