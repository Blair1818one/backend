const express = require('express');
const router = express.Router();
const {
    getAllBranches,
    getBranchById,
    createBranch,
    updateBranch,
    deleteBranch
} = require('../controllers/branchController');
const {
    validateBranch
} = require('../middleware/validation');
const {
    authenticate,
    authorize
} = require('../middleware/auth');

// All routes require authentication
router.use(authenticate);

// Get all branches
router.get('/', getAllBranches);

// Get branch by ID
router.get('/:id', getBranchById);

// Create branch (Only CEO)
router.post('/', authorize('CEO'), validateBranch, createBranch);

// Update branch (Only CEO)
router.put('/:id', authorize('CEO'), updateBranch);

// Delete branch (Only CEO)
router.delete('/:id', authorize('CEO'), deleteBranch);

module.exports = router;