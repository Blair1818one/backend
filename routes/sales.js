const express = require('express');
const router = express.Router();
const {
    createSale,
    getAllSales,
    getSaleById,
    updateSale,
    deleteSale
} = require('../controllers/salesController');
const {
    validateSale
} = require('../middleware/validation');
const {
    authenticate,
    authorize
} = require('../middleware/auth');

// All routes require authentication
router.use(authenticate);

// Create sale (Manager and Sales Agent can create)
router.post('/', authorize('CEO', 'Manager', 'Sales Agent'), validateSale, createSale);

// Get all sales
router.get('/', getAllSales);

// Get sale by ID
router.get('/:id', getSaleById);

// Update sale (Manager and CEO can update)
router.put('/:id', authorize('CEO', 'Manager'), updateSale);

// Delete sale (Only CEO can delete)
router.delete('/:id', authorize('CEO'), deleteSale);

module.exports = router;