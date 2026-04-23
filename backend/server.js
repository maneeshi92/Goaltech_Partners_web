const express = require('express');
const mysql = require('mysql2');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
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

const dbConfig = {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    connectTimeout: 10000 // 10 second timeout for initial connection
};

// Automatically enable SSL for TiDB Cloud connections
if (process.env.DB_HOST && process.env.DB_HOST.includes('tidbcloud.com')) {
    dbConfig.ssl = {
        minVersion: 'TLSv1.2',
        rejectUnauthorized: true
    };
}

const db = mysql.createPool(dbConfig);
const promisePool = db.promise();

let isDbConnected = false;

// Verify pool connection
promisePool.query('SELECT 1')
    .then(() => {
        console.log('Successfully connected to MySQL Database Pool');
        isDbConnected = true;
    })
    .catch(err => {
        console.error('CRITICAL: MySQL Pool Connection Failed:', err.message);
        isDbConnected = false;
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

app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, '../dashboard.html'));
});

// --- Register Endpoint ---
app.post('/register', checkDbConnection, async (req, res) => {
    const { name, email, phone, password } = req.body;
    console.log('Registration attempt for:', email);

    if (!name || !email || !phone || !password) {
        return res.status(400).json({ success: false, message: 'All fields are required' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const query = 'INSERT INTO users (name, email, phone, password) VALUES (?, ?, ?, ?)';

        db.query(query, [name, email, phone, hashedPassword], (err, result) => {
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
    } catch (err) {
        console.error('Password Hashing Error:', err);
        res.status(500).json({ success: false, message: 'Internal server error while securing password' });
    }
});

// --- Login Endpoint ---
app.post('/login', checkDbConnection, (req, res) => {
    const { email, password } = req.body;
    console.log('Login attempt for:', email);

    if (!email || !password) {
        return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    const query = 'SELECT * FROM users WHERE email = ?';
    db.query(query, [email], async (err, results) => {
        if (err) {
            console.error('Login Query Error:', err.message);
            return res.status(500).json({ success: false, message: `Database error: ${err.message}` });
        }

        if (results.length === 0) {
            console.log('Login failed: Email not found');
            return res.status(401).json({ success: false, message: 'No account found with this email' });
        }

        const user = results[0];

        // Check if password matches using bcrypt
        const isMatch = await bcrypt.compare(password, user.password);
        
        if (!isMatch) {
            console.log('Login failed: Password mismatch');
            return res.status(401).json({ success: false, message: 'Incorrect password' });
        }

        const token = jwt.sign(
            { id: user.id, email: user.email },
            process.env.JWT_SECRET || 'fallback_secret',
            { expiresIn: '24h' }
        );

        console.log('Login successful for:', email);
        res.json({
            success: true,
            token: token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email
            }
        });
    });
});

// Authentication Middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ success: false, message: 'Unauthorized' });

    jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret', (err, user) => {
        if (err) return res.status(403).json({ success: false, message: 'Forbidden' });
        req.user = user;
        next();
    });
};

// --- Business Endpoints ---

// Create Business
app.post('/businesses', authenticateToken, checkDbConnection, (req, res) => {
    const { name, facilities } = req.body;
    const userId = req.user.id;

    if (!name || !facilities || !Array.isArray(facilities)) {
        return res.status(400).json({ success: false, message: 'Invalid data' });
    }

    db.beginTransaction(err => {
        if (err) return res.status(500).json({ success: false, message: 'Transaction error' });

        const businessQuery = 'INSERT INTO businesses (user_id, name) VALUES (?, ?)';
        db.query(businessQuery, [userId, name], (err, result) => {
            if (err) {
                return db.rollback(() => {
                    res.status(500).json({ success: false, message: 'Error creating business' });
                });
            }

            const businessId = result.insertId;
            const facilityQuery = `INSERT INTO facilities 
                (business_id, type, label, icon, mode, hours, amenities, price, weekendPrice, peakPrice, peakStart, peakEnd, capacity, description, phone, website) 
                VALUES ?`;

            const facilityData = facilities.map(f => [
                businessId,
                f.type,
                f.label,
                f.icon,
                f.mode,
                JSON.stringify(f.hours),
                JSON.stringify(f.amenities),
                f.price || null,
                f.weekendPrice || null,
                f.peakPrice || null,
                f.peakStart || null,
                f.peakEnd || null,
                f.capacity || null,
                f.description || '',
                f.phone || '',
                f.website || ''
            ]);

            db.query(facilityQuery, [facilityData], (err, result) => {
                if (err) {
                    return db.rollback(() => {
                        console.error('Error inserting facilities:', err);
                        res.status(500).json({ success: false, message: 'Error creating facilities' });
                    });
                }

                db.commit(err => {
                    if (err) {
                        return db.rollback(() => {
                            res.status(500).json({ success: false, message: 'Commit error' });
                        });
                    }
                    res.status(201).json({ success: true, message: 'Business created successfully', businessId });
                });
            });
        });
    });
});

// Get Businesses
app.get('/businesses', authenticateToken, checkDbConnection, (req, res) => {
    const userId = req.user.id;
    console.log(`Fetching businesses for user ID: ${userId}`);
    const query = `
        SELECT b.*, 
               u.name as owner_name,
               u.email as owner_email,
               GROUP_CONCAT(f.type) as facility_types,
               COUNT(f.id) as facility_count
        FROM businesses b
        JOIN users u ON b.user_id = u.id
        LEFT JOIN facilities f ON b.id = f.business_id
        WHERE b.user_id = ?
        GROUP BY b.id, u.name, u.email
        ORDER BY b.created_at DESC
    `;

    db.query(query, [userId], (err, results) => {
        if (err) {
            console.error('Error fetching businesses:', err);
            return res.status(500).json({ success: false, message: 'Database error' });
        }
        res.json({ success: true, businesses: results });
    });
});

// Create Business
app.post('/businesses', authenticateToken, checkDbConnection, async (req, res) => {
    const userId = req.user.id;
    const { name, status, facilities } = req.body;

    if (!name || !facilities) {
        return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const connection = await db.promise().getConnection();
    try {
        await connection.beginTransaction();

        // 1. Insert business
        const [bizResult] = await connection.query('INSERT INTO businesses (user_id, name, status) VALUES (?, ?, ?)', [userId, name, status || 'active']);
        const businessId = bizResult.insertId;

        // 2. Insert facilities
        if (facilities.length > 0) {
            const facilityData = facilities.map(f => [
                businessId,
                f.type,
                f.label,
                f.icon,
                f.mode,
                f.status || 'active',
                JSON.stringify(f.hours),
                JSON.stringify(f.amenities),
                f.price,
                f.weekendPrice,
                f.peakPrice,
                f.peakStart,
                f.peakEnd,
                f.capacity,
                f.description,
                f.phone,
                f.website,
                f.venue,
                f.venue_location
            ]);

            const facilityQuery = `INSERT INTO facilities 
                (business_id, type, label, icon, mode, status, hours, amenities, price, weekendPrice, peakPrice, peakStart, peakEnd, capacity, description, phone, website, venue, venue_location) 
                VALUES ?`;
            
            await connection.query(facilityQuery, [facilityData]);
        }

        await connection.commit();
        res.json({ success: true, businessId });
    } catch (err) {
        await connection.rollback();
        console.error('Error creating business:', err);
        res.status(500).json({ success: false, message: 'Server error during creation' });
    } finally {
        connection.release();
    }
});

// Get Single Business with facilities
app.get('/businesses/:id', authenticateToken, checkDbConnection, (req, res) => {
    const userId = req.user.id;
    const bizId = req.params.id;

    const query = `
        SELECT b.id as biz_id, b.name as biz_name, b.user_id,
               f.id as fac_id, f.type, f.label, f.icon, f.mode, f.hours, f.amenities, 
               f.price, f.weekendPrice, f.peakPrice, f.peakStart, f.peakEnd, 
               f.capacity, f.description, f.phone, f.website, f.venue, f.venue_location, f.status
        FROM businesses b
        LEFT JOIN facilities f ON b.id = f.business_id
        WHERE b.id = ? AND b.user_id = ?
    `;

    db.query(query, [bizId, userId], (err, results) => {
        if (err) {
            console.error('Error fetching business details:', err);
            return res.status(500).json({ success: false, message: 'Error fetching business details' });
        }
        
        if (results.length === 0) {
            return res.status(404).json({ success: false, message: 'Business not found' });
        }

        const business = {
            id: results[0].biz_id,
            name: results[0].biz_name,
            facilities: results.filter(r => r.fac_id !== null).map(r => ({
                id: r.fac_id,
                type: r.type,
                label: r.label,
                icon: r.icon,
                mode: r.mode,
                hours: typeof r.hours === 'string' ? JSON.parse(r.hours) : r.hours,
                amenities: typeof r.amenities === 'string' ? JSON.parse(r.amenities) : r.amenities,
                price: r.price,
                weekendPrice: r.weekendPrice,
                peakPrice: r.peakPrice,
                peakStart: r.peakStart,
                peakEnd: r.peakEnd,
                capacity: r.capacity,
                description: r.description,
                phone: r.phone,
                website: r.website,
                venue: r.venue,
                                venue_location: r.venue_location,
                status: r.status
            }))
        };

        res.json({ success: true, business });
    });
});


// Update Business
app.put('/businesses/:id', authenticateToken, checkDbConnection, async (req, res) => {
    const userId = req.user.id;
    const bizId = req.params.id;
    const { name, status, facilities } = req.body;

    if (!name || !facilities) {
        return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const connection = await db.promise().getConnection();
    try {
        await connection.beginTransaction();

        // 1. Update business
        await connection.query('UPDATE businesses SET `name` = ?, `status` = ? WHERE `id` = ? AND `user_id` = ?', [name, status || 'active', bizId, userId]);

        // 2. Delete old facilities
        await connection.query('DELETE FROM facilities WHERE business_id = ?', [bizId]);

        // 3. Insert new facilities
        if (facilities.length > 0) {
            const facilityData = facilities.map(f => [
                bizId,
                f.type,
                f.label,
                f.icon,
                f.mode,
                f.status || 'active',
                JSON.stringify(f.hours),
                JSON.stringify(f.amenities),
                f.price,
                f.weekendPrice,
                f.peakPrice,
                f.peakStart,
                f.peakEnd,
                f.capacity,
                f.description,
                f.phone,
                f.website,
                f.venue,
                f.venue_location
            ]);

            const facilityQuery = `INSERT INTO facilities 
                (\`business_id\`, \`type\`, \`label\`, \`icon\`, \`mode\`, \`status\`, \`hours\`, \`amenities\`, \`price\`, \`weekendPrice\`, \`peakPrice\`, \`peakStart\`, \`peakEnd\`, \`capacity\`, \`description\`, \`phone\`, \`website\`, \`venue\`, \`venue_location\`) 
                VALUES ?`;
            
            console.log(`Inserting ${facilities.length} facilities for business ${bizId}`);
            await connection.query(facilityQuery, [facilityData]);
        }

        await connection.commit();
        res.json({ success: true, message: 'Business updated successfully' });
    } catch (err) {
        await connection.rollback();
        console.error('Error updating business:', err);
        res.status(500).json({ success: false, message: 'Server error during update' });
    } finally {
        connection.release();
    }
});

// Register Business
app.post('/businesses/register', authenticateToken, checkDbConnection, async (req, res) => {
    const userId = req.user.id;
    const { bizId, name, contact_name, contact_phone, gst_vat, registered_address } = req.body;

    if (!name || !contact_name || !contact_phone || !registered_address) {
        return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    try {
        if (bizId) {
            // Update existing rejected business
            const query = `
                UPDATE businesses 
                SET name = ?, contact_name = ?, contact_phone = ?, gst_vat = ?, registered_address = ?, status = 'pending', reject_reason = NULL
                WHERE id = ? AND user_id = ?
            `;
            await db.promise().query(query, [name, contact_name, contact_phone, gst_vat, registered_address, bizId, userId]);
            res.json({ success: true, message: 'Registration resubmitted successfully' });
        } else {
            // Create new pending business
            const query = `
                INSERT INTO businesses (user_id, name, contact_name, contact_phone, gst_vat, registered_address, status)
                VALUES (?, ?, ?, ?, ?, ?, 'pending')
            `;
            const [result] = await db.promise().query(query, [userId, name, contact_name, contact_phone, gst_vat, registered_address]);
            res.status(201).json({ success: true, message: 'Business registered successfully', businessId: result.insertId });
        }
    } catch (err) {
        console.error('Error registering business:', err);
        res.status(500).json({ success: false, message: 'Server error during registration' });
    }
});

// Admin: Get Approvals
app.get('/admin/approvals', authenticateToken, checkDbConnection, async (req, res) => {
    try {
        const query = `
            SELECT b.*, u.name as owner_name, u.email as owner_email
            FROM businesses b
            JOIN users u ON b.user_id = u.id
            WHERE b.status = 'pending'
            ORDER BY b.created_at ASC
        `;
        const [results] = await db.promise().query(query);
        res.json({ success: true, approvals: results });
    } catch (err) {
        console.error('Error fetching approvals:', err);
        res.status(500).json({ success: false, message: 'Server error fetching approvals' });
    }
});

// Admin: Approve Business
app.put('/admin/approvals/:id/approve', authenticateToken, checkDbConnection, async (req, res) => {
    const bizId = req.params.id;
    try {
        await db.promise().query('UPDATE businesses SET status = "active", reject_reason = NULL WHERE id = ?', [bizId]);
        res.json({ success: true, message: 'Business approved' });
    } catch (err) {
        console.error('Error approving business:', err);
        res.status(500).json({ success: false, message: 'Server error approving business' });
    }
});

// Admin: Reject Business
app.put('/admin/approvals/:id/reject', authenticateToken, checkDbConnection, async (req, res) => {
    const bizId = req.params.id;
    const { reason } = req.body;
    try {
        await db.promise().query('UPDATE businesses SET status = "rejected", reject_reason = ? WHERE id = ?', [reason || 'No reason provided', bizId]);
        res.json({ success: true, message: 'Business rejected' });
    } catch (err) {
        console.error('Error rejecting business:', err);
        res.status(500).json({ success: false, message: 'Server error rejecting business' });
    }
});

// Delete a specific facility
app.delete('/businesses/:bizId/facilities/:facId', checkDbConnection, async (req, res) => {
    const { bizId, facId } = req.params;
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ success: false, message: 'No token provided' });

    try {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decoded.userId;

        // Verify ownership
        const [biz] = await promisePool.query('SELECT id FROM businesses WHERE id = ? AND user_id = ?', [bizId, userId]);
        if (biz.length === 0) return res.status(403).json({ success: false, message: 'Unauthorized' });

        await promisePool.query('DELETE FROM facilities WHERE id = ? AND business_id = ?', [facId, bizId]);
        res.json({ success: true, message: 'Facility deleted' });
    } catch (err) {
        console.error('Error deleting facility:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Delete all facilities in a venue
app.delete('/businesses/:bizId/venues/:venueName', checkDbConnection, async (req, res) => {
    const { bizId, venueName } = req.params;
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ success: false, message: 'No token provided' });

    try {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decoded.userId;

        // Verify ownership
        const [biz] = await promisePool.query('SELECT id FROM businesses WHERE id = ? AND user_id = ?', [bizId, userId]);
        if (biz.length === 0) return res.status(403).json({ success: false, message: 'Unauthorized' });

        await promisePool.query('DELETE FROM facilities WHERE business_id = ? AND venue = ?', [bizId, venueName]);
        res.json({ success: true, message: 'Venue and its services deleted' });
    } catch (err) {
        console.error('Error deleting venue:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`GoalTech Backend running at http://localhost:${PORT}`);
});

