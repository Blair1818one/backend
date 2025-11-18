const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();

// Import routes (if needed)
const authRoutes = require('./routes/auth');
const procurementRoutes = require('./routes/procurement');
const salesRoutes = require('./routes/sales');
const stockRoutes = require('./routes/stock');
const creditRoutes = require('./routes/credit');
const analyticsRoutes = require('./routes/analytics');
const reportsRoutes = require('./routes/reports');
const branchRoutes = require('./routes/branches');

// Import database connection
const pool = require('./config/database');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true
}));
app.use(express.json());

// ===== Authentication route =====
app.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) return res.status(404).json({ message: 'Email and Password are mandatory' });

        const query = 'SELECT * FROM users WHERE email = ? AND password = ?';
        const [rows] = await pool.query(query, [email, password]);
        if (rows.length === 0) return res.status(404).json({ message: 'User does not exist' });

        const user = rows[0];
        const payload = { user_id: user.user_id, name: user.name, role: user.role, branch_id: user.branch_id };
        const token = jwt.sign(payload, process.env.JWT_SECRET || 'mysecretekey', { expiresIn: '1h' });

        res.json({ token });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'An error occurred' });
    }
});

// ===== JWT authentication middleware =====
function userAuthentication(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.sendStatus(401);

    jwt.verify(token, process.env.JWT_SECRET || 'mysecretekey', (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
}

// ===== GET endpoints for each table =====
app.get('/api/branches', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM branches');
        res.json({ branches: rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error fetching branches' });
    }
});

app.get('/api/users', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM users');
        res.json({ users: rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error fetching users' });
    }
});

app.get('/api/produce', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM produce');
        res.json({ produce: rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error fetching produce' });
    }
});

app.get('/api/procurement', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM procurement');
        res.json({ procurement: rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error fetching procurement' });
    }
});

app.get('/api/sales', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM sales');
        res.json({ sales: rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error fetching sales' });
    }
});

app.get('/api/credit_sales', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM credit_sales');
        res.json({ credit_sales: rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error fetching credit_sales' });
    }
});

// ===== Test /a endpoint =====
app.get('/a', (req, res) => {
    const token = "sample-get-token-123";
    res.json({ message: "GET request successful", token });
});

app.post('/a', (req, res) => {
    const { username, password } = req.body;
    const token = `token-for-${username || "unknown"}`;
    res.json({ message: "POST request successful", token });
});

// ===== Mount other routes =====
app.use('/api/auth', authRoutes);
app.use('/api/procurement', procurementRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/stock', stockRoutes);
app.use('/api/credit', creditRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/branches', branchRoutes);

// ===== Root test route =====
app.get('/', (req, res) => {
    res.json({ message: 'Server is working and connected to GCDL database!' });
});

// ===== Start server =====
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔗 API Base URL: http://localhost:${PORT}/api`);
});

module.exports = app;
