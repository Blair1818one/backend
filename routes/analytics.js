const express = require('express');
const router = express.Router();
const {
    getDashboardAnalytics,
    getSalesAnalytics,
    getProcurementAnalytics
} = require('../controllers/analyticsController');
const {
    authenticate
} = require('../middleware/auth');

// All routes require authentication
router.use(authenticate);

// Get dashboard analytics
router.get('/dashboard', getDashboardAnalytics);

// Get sales analytics
router.get('/sales', getSalesAnalytics);

// Get procurement analytics
router.get('/procurement', getProcurementAnalytics);

module.exports = router;