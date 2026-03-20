const { body, validationResult } = require('express-validator');

/**
 * Middleware to check validation results
 */
const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        res.status(400);
        const errorMessages = errors.array().map(err => err.msg).join(', ');
        return next(new Error(errorMessages));
    }
    next();
};

/**
 * Registration validation rules
 */
const registerValidation = [
    body('name')
        .optional({ values: 'falsy' })
        .trim()
        .isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters'),

    body('firstName')
        .optional({ values: 'falsy' })
        .trim()
        .isLength({ min: 2, max: 50 }).withMessage('First name must be between 2 and 50 characters'),

    body('lastName')
        .optional({ values: 'falsy' })
        .trim()
        .isLength({ min: 2, max: 50 }).withMessage('Last name must be between 2 and 50 characters'),

    body().custom((_, { req }) => {
        const hasFullName = typeof req.body.name === 'string' && req.body.name.trim().length >= 2;
        const hasSplitName = typeof req.body.firstName === 'string'
            && req.body.firstName.trim().length >= 2
            && typeof req.body.lastName === 'string'
            && req.body.lastName.trim().length >= 2;

        if (!hasFullName && !hasSplitName) {
            throw new Error('First name and last name are required');
        }

        return true;
    }),

    body('email')
        .trim()
        .notEmpty().withMessage('Email is required')
        .isEmail().withMessage('Must be a valid email address')
        .normalizeEmail(),

    body('sendInvite')
        .optional()
        .isBoolean().withMessage('Send invite must be true or false'),

    body('password')
        .optional({ values: 'falsy' })
        .isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),

    body().custom((_, { req }) => {
        const sendInvite = req.body.sendInvite === true || req.body.sendInvite === 'true';
        const hasPassword = typeof req.body.password === 'string' && req.body.password.length >= 6;

        if (!sendInvite && !hasPassword) {
            throw new Error('Password is required unless a setup email invite is sent');
        }

        return true;
    }),

    body('role')
        .optional()
        .isIn(['student', 'admin']).withMessage('Role must be either student or admin'),

    body('enrollmentNo')
        .optional()
        .trim()
        .isLength({ min: 3, max: 50 }).withMessage('Enrollment number must be between 3 and 50 characters')
        .matches(/^[A-Z0-9]+$/i).withMessage('Enrollment number must contain only letters and numbers'),

    validate
];

/**
 * Login validation rules
 */
const loginValidation = [
    body('email')
        .trim()
        .notEmpty().withMessage('Enrollment number or email is required'),

    body('password')
        .notEmpty().withMessage('Password is required')
        .isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),

    validate
];

/**
 * Email validation for resend verification
 */
const emailValidation = [
    body('email')
        .trim()
        .notEmpty().withMessage('Email is required')
        .isEmail().withMessage('Must be a valid email address')
        .normalizeEmail(),

    validate
];

/**
 * Password reset validation
 */
const passwordResetValidation = [
    body('token')
        .notEmpty().withMessage('Reset token is required'),

    body('newPassword')
        .notEmpty().withMessage('New password is required')
        .isLength({ min: 8 }).withMessage('Password must be at least 8 characters long')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>])/).withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),

    validate
];

module.exports = {
    registerValidation,
    loginValidation,
    emailValidation,
    passwordResetValidation,
};
