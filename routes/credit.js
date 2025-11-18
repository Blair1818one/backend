const express = require('express');
const router = express.Router();
const {
    getAllCredits,
    getCreditById,
    updateCreditPayment,
    getCreditStats
} = require('../controllers/creditController');
const {
    authenticate,
    authorize
} = require('../middleware/auth');

// All routes require authentication
router.use(authenticate);

// Get credit statistics
router.get('/stats', getCreditStats);

// Get all credit sales
router.get('/', getAllCredits);

// Get credit by ID
router.get('/:id', getCreditById);

// Update credit payment (Manager and CEO can update)
router.put('/:id/payment', authorize('CEO', 'Manager'), updateCreditPayment);

module.exports = router;