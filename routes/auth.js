const express = require('express');
const router = express.Router();
const {
    register,
    login,
    getCurrentUser
} = require('../controllers/authController');
const {
    validateRegister,
    validateLogin
} = require('../middleware/validation');
const {
    authenticate
} = require('../middleware/auth');

// Public routes
router.post('/register', validateRegister, register);
router.post('/login', validateLogin, login);

// Protected routes
router.get('/me', authenticate, getCurrentUser);

module.exports = router;