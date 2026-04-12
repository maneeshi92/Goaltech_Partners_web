const express = require('express');
const mysql = require('mysql2');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Request Logging Middleware
app.use((req, res, next) => {
    console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);
    next();
});

// Serve static files from the root directory
app.use(express.static(path.join(__dirname, '../')));

// Database Connection
const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    connectTimeout: 10000 // 10 second timeout for initial connection
});

let isDbConnected = false;

db.connect((err) => {
    if (err) {
        console.error('CRITICAL: MySQL Connection Failed:', err.message);
        isDbConnected = false;
        return;
    }
    console.log('Successfully connected to MySQL Database');
    isDbConnected = true;
});

// Middleware to check DB connection
const checkDbConnection = (req, res, next) => {
    if (!isDbConnected) {
        console.log('Request Blocked: Database not connected');
        return res.status(500).json({
            success: false,
            message: 'Database is not connected. Please check your backend .env configuration and restart the server.'
        });
    }
    next();
};

// Health Check / Root Route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../index.html'));
});

// --- Register Endpoint ---
app.post('/register', checkDbConnection, (req, res) => {
    const { name, email, phone, password } = req.body;
    console.log('Registration attempt for:', email);

    if (!name || !email || !phone || !password) {
        return res.status(400).json({ success: false, message: 'All fields are required' });
    }

    const query = 'INSERT INTO users (name, email, phone, password) VALUES (?, ?, ?, ?)';

    db.query(query, [name, email, phone, password], (err, result) => {
        if (err) {
            console.error('Registration Query Error:', err.message);
            if (err.code === 'ER_DUP_ENTRY') {
                return res.status(400).json({ success: false, message: 'Email already exists' });
            }
            return res.status(500).json({ success: false, message: `Database error: ${err.message}` });
        }
        console.log('User registered successfully:', email);
        res.status(201).json({ success: true, message: 'User registered successfully' });
    });
});

// --- Login Endpoint ---
app.post('/login', checkDbConnection, (req, res) => {
    const { email, password } = req.body;
    console.log('Login attempt for:', email);

    if (!email || !password) {
        return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    const query = 'SELECT * FROM users WHERE email = ?';
    db.query(query, [email], (err, results) => {
        if (err) {
            console.error('Login Query Error:', err.message);
            return res.status(500).json({ success: false, message: `Database error: ${err.message}` });
        }

        if (results.length === 0) {
            console.log('Login failed: Email not found');
            return res.status(401).json({ success: false, message: 'No account found with this email' });
        }

        const user = results[0];

        if (password !== user.password) {
            console.log('Login failed: Password mismatch');
            return res.status(401).json({ success: false, message: 'Incorrect password' });
        }

        const token = jwt.sign(
            { id: user.id, email: user.email },
            process.env.JWT_SECRET || 'fallback_secret',
            { expiresIn: '1h' }
        );

        console.log('Login successful for:', email);
        res.json({
            success: true,
            token: token,
            user: {
                name: user.name,
                email: user.email
            }
        });
    });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`GoalTech Backend running at http://localhost:${PORT}`);
});

