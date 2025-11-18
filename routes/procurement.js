const express = require('express');
const router = express.Router();
const {
    createProcurement,
    getAllProcurements,
    getProcurementById,
    updateProcurement,
    deleteProcurement
} = require('../controllers/procurementController');
const {
    validateProcurement
} = require('../middleware/validation');
const {
    authenticate,
    authorize
} = require('../middleware/auth');

// All routes require authentication
router.use(authenticate);

// Create procurement (Manager and Sales Agent can create)
router.post('/', authorize('CEO', 'Manager', 'Sales Agent'), validateProcurement, createProcurement);

// Get all procurements
router.get('/', getAllProcurements);

// Get procurement by ID
router.get('/:id', getProcurementById);

// Update procurement (Manager and CEO can update)
router.put('/:id', authorize('CEO', 'Manager'), updateProcurement);

// Delete procurement (Only CEO can delete)
router.delete('/:id', authorize('CEO'), deleteProcurement);

module.exports = router;