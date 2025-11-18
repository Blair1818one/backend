const jwt = require('jsonwebtoken');
const pool = require('../config/database');

// Verify JWT token
const authenticate = async (req, res, next) => {
    try {
        const authHeader = req.header('Authorization');
        const token = authHeader ? authHeader.replace('Bearer ', '') : null;

        if (!token) {
            return res.status(401).json({
                message: 'No token provided, authorization denied'
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Get user from database
        const [users] = await pool.execute(
            'SELECT user_id, name, email, role, branch_id FROM users WHERE user_id = ?',
            [decoded.userId]
        );

        if (users.length === 0) {
            return res.status(401).json({
                message: 'User not found'
            });
        }

        req.user = users[0];
        next();
    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                message: 'Invalid token'
            });
        }
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                message: 'Token expired'
            });
        }
        res.status(500).json({
            message: 'Server error',
            error: error.message
        });
    }
};

// Role-based authorization middleware
const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                message: 'Unauthorized'
            });
        }

        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                message: 'Access denied. Insufficient permissions.'
            });
        }

        next();
    };
};

// Check if user has access to branch
const checkBranchAccess = async (req, res, next) => {
    try {
        const branchId = req.params.branchId || req.body.branch_id || req.query.branch_id;

        // CEO can access all branches
        if (req.user.role === 'CEO') {
            return next();
        }

        // Manager and Sales Agent can only access their own branch
        if (req.user.branch_id && parseInt(branchId) !== req.user.branch_id) {
            return res.status(403).json({
                message: 'Access denied. You can only access your branch data.'
            });
        }

        next();
    } catch (error) {
        res.status(500).json({
            message: 'Server error',
            error: error.message
        });
    }
};

module.exports = {
    authenticate,
    authorize,
    checkBranchAccess
};