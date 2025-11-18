const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');

// Register new user
const register = async (req, res) => {
    try {
        const {
            name,
            email,
            password,
            role,
            branch_id
        } = req.body;

        // Check if user already exists
        const [existingUsers] = await pool.execute(
            'SELECT user_id FROM users WHERE email = ?',
            [email]
        );

        if (existingUsers.length > 0) {
            return res.status(400).json({
                message: 'User with this email already exists'
            });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Insert user
        const [result] = await pool.execute(
            'INSERT INTO users (name, email, password, role, branch_id) VALUES (?, ?, ?, ?, ?)',
            [name, email, hashedPassword, role, branch_id || null]
        );

        // Generate JWT token
        const token = jwt.sign({
                userId: result.insertId,
                email,
                role
            },
            process.env.JWT_SECRET, {
                expiresIn: process.env.JWT_EXPIRE || '24h'
            }
        );

        res.status(201).json({
            message: 'User registered successfully',
            token,
            user: {
                user_id: result.insertId,
                name,
                email,
                role,
                branch_id
            }
        });
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({
            message: 'Server error',
            error: error.message
        });
    }
};

// Login user
const login = async (req, res) => {
    try {
        const {
            email,
            password
        } = req.body;

        // Find user
        const [users] = await pool.execute(
            'SELECT user_id, name, email, password, role, branch_id FROM users WHERE email = ?',
            [email]
        );

        if (users.length === 0) {
            return res.status(401).json({
                message: 'Invalid credentials'
            });
        }

        const user = users[0];

        // Verify password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({
                message: 'Invalid credentials'
            });
        }

        // Generate JWT token
        const token = jwt.sign({
                userId: user.user_id,
                email: user.email,
                role: user.role
            },
            process.env.JWT_SECRET, {
                expiresIn: process.env.JWT_EXPIRE || '24h'
            }
        );

        res.json({
            message: 'Login successful',
            token,
            user: {
                user_id: user.user_id,
                name: user.name,
                email: user.email,
                role: user.role,
                branch_id: user.branch_id
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            message: 'Server error',
            error: error.message
        });
    }
};

// Get current user
const getCurrentUser = async (req, res) => {
    try {
        const [users] = await pool.execute(
            `SELECT u.user_id, u.name, u.email, u.role, u.branch_id, b.branch_name, b.location 
       FROM users u 
       LEFT JOIN branches b ON u.branch_id = b.branch_id 
       WHERE u.user_id = ?`,
            [req.user.user_id]
        );

        if (users.length === 0) {
            return res.status(404).json({
                message: 'User not found'
            });
        }

        res.json({
            user: users[0]
        });
    } catch (error) {
        console.error('Get current user error:', error);
        res.status(500).json({
            message: 'Server error',
            error: error.message
        });
    }
};

module.exports = {
    register,
    login,
    getCurrentUser
};