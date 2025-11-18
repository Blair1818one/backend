const express = require('express');
const router = express.Router();
const {
    getAllStock,
    getStockById,
    createStock,
    updateStock,
    deleteStock,
    getLowStockAlerts
} = require('../controllers/stockController');
const {
    validateProduce
} = require('../middleware/validation');
const {
    authenticate,
    authorize
} = require('../middleware/auth');

// All routes require authentication
router.use(authenticate);

// Get all stock
router.get('/', getAllStock);

// Get low stock alerts
router.get('/alerts', getLowStockAlerts);

// Get stock by ID
router.get('/:id', getStockById);

// Create stock (Manager and CEO can create)
router.post('/', authorize('CEO', 'Manager'), validateProduce, createStock);

// Update stock (Manager and CEO can update)
router.put('/:id', authorize('CEO', 'Manager'), updateStock);

// Delete stock (Only CEO can delete)
router.delete('/:id', authorize('CEO'), deleteStock);

module.exports = router;