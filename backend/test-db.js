const mysql = require('mysql2');
require('dotenv').config();

console.log('--- GoalTech DB Diagnostic Tool ---');
console.log('Checking .env configuration...');
console.log('Host:', process.env.DB_HOST);
console.log('User:', process.env.DB_USER);
console.log('Database:', process.env.DB_NAME);
console.log('---------------------------------');

const connection = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME
});

connection.connect((err) => {
    if (err) {
        console.error('❌ Connection FAILED!');
        console.error('Error Code:', err.code);
        console.error('Error Message:', err.message);

        if (err.code === 'ER_ACCESS_DENIED_ERROR') {
            console.log('\nTIP: Double-check your DB_PASS in .env. Is it correct for the root user?');
        } else if (err.code === 'ECONNREFUSED') {
            console.log('\nTIP: Is your MySQL service running? Try starting it from XAMPP or Services.msc.');
        } else if (err.code === 'ER_BAD_DB_ERROR') {
            console.log('\nTIP: The database "' + process.env.DB_NAME + '" does not exist. Run backend/db.sql first!');
        }
    } else {
        console.log('✅ Connection SUCCESSFUL!');

        connection.query('SHOW TABLES LIKE "users"', (err, results) => {
            if (err) {
                console.error('❌ Query failed:', err.message);
            } else if (results.length === 0) {
                console.log('⚠️ WARNING: "users" table NOT FOUND. Please run backend/db.sql in your database.');
            } else {
                console.log('✅ "users" table exists.');
                console.log('Database setup is correct!');
            }
            connection.end();
        });
    }
});
