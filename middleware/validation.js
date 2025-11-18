const {
    body,
    validationResult
} = require('express-validator');

// Handle validation errors
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            message: 'Validation failed',
            errors: errors.array()
        });
    }
    next();
};

// Authentication validation
const validateRegister = [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').isLength({
        min: 6
    }).withMessage('Password must be at least 6 characters'),
    body('role').isIn(['CEO', 'Manager', 'Sales Agent']).withMessage('Invalid role'),
    handleValidationErrors
];

const validateLogin = [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required'),
    handleValidationErrors
];

// Procurement validation
const validateProcurement = [
    body('produce_id').isInt().withMessage('Valid produce ID is required'),
    body('dealer_name').trim().notEmpty().withMessage('Dealer name is required'),
    body('dealer_type').isIn(['individual', 'company', 'farm']).withMessage('Invalid dealer type'),
    body('tonnage').isFloat({
        min: 0.01
    }).withMessage('Tonnage must be greater than 0'),
    body('cost_per_ton').isFloat({
        min: 0
    }).withMessage('Cost per ton must be 0 or greater'),
    body('total_cost').isFloat({
        min: 0
    }).withMessage('Total cost must be 0 or greater'),
    body('selling_price_per_ton').isFloat({
        min: 0
    }).withMessage('Selling price per ton must be 0 or greater'),
    body('branch_id').isInt().withMessage('Valid branch ID is required'),
    handleValidationErrors
];

// Sales validation
const validateSale = [
    body('produce_id').isInt().withMessage('Valid produce ID is required'),
    body('buyer_name').trim().notEmpty().withMessage('Buyer name is required'),
    body('tonnage').isFloat({
        min: 0.01
    }).withMessage('Tonnage must be greater than 0'),
    body('amount_paid').isFloat({
        min: 0
    }).withMessage('Amount paid must be 0 or greater'),
    body('payment_type').isIn(['cash', 'credit']).withMessage('Payment type must be cash or credit'),
    body('branch_id').isInt().withMessage('Valid branch ID is required'),
    handleValidationErrors
];

// Credit sales validation
const validateCreditSale = [
    body('buyer_national_id').optional().trim().notEmpty().withMessage('Buyer national ID cannot be empty'),
    body('buyer_location').optional().trim().notEmpty().withMessage('Buyer location cannot be empty'),
    body('amount_due').isFloat({
        min: 0.01
    }).withMessage('Amount due must be greater than 0'),
    body('due_date').isISO8601().withMessage('Valid due date is required'),
    handleValidationErrors
];

// Branch validation
const validateBranch = [
    body('branch_name').trim().notEmpty().withMessage('Branch name is required'),
    body('location').trim().notEmpty().withMessage('Location is required'),
    handleValidationErrors
];

// Produce validation
const validateProduce = [
    body('name').trim().notEmpty().withMessage('Produce name is required'),
    body('type').trim().notEmpty().withMessage('Produce type is required'),
    body('branch_id').isInt().withMessage('Valid branch ID is required'),
    handleValidationErrors
];

module.exports = {
    validateRegister,
    validateLogin,
    validateProcurement,
    validateSale,
    validateCreditSale,
    validateBranch,
    validateProduce,
    handleValidationErrors
};