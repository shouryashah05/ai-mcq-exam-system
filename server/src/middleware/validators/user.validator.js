const { body, validationResult } = require('express-validator');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400);
    const errorMessages = errors.array().map((error) => error.msg).join(', ');
    return next(new Error(errorMessages));
  }
  next();
};

const bulkCreateUsersValidation = [
  body('users')
    .isArray({ min: 1, max: 500 }).withMessage('Users must be an array with between 1 and 500 records'),

  body('temporaryPassword')
    .trim()
    .notEmpty().withMessage('Temporary password is required for bulk import')
    .isLength({ min: 6 }).withMessage('Temporary password must be at least 6 characters long'),

  body('sendInvite')
    .optional()
    .isBoolean().withMessage('Send invite must be true or false'),

  body('users.*.firstName')
    .trim()
    .notEmpty().withMessage('Each user must include a first name')
    .isLength({ min: 2, max: 50 }).withMessage('Each first name must be between 2 and 50 characters'),

  body('users.*.lastName')
    .trim()
    .notEmpty().withMessage('Each user must include a last name')
    .isLength({ min: 2, max: 50 }).withMessage('Each last name must be between 2 and 50 characters'),

  body('users.*.email')
    .trim()
    .notEmpty().withMessage('Each user must include an email')
    .isEmail().withMessage('Each email must be valid')
    .normalizeEmail(),

  body('users.*.role')
    .optional()
    .isIn(['student', 'admin']).withMessage('Each role must be either student or admin'),

  body('users.*.enrollmentNo')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ min: 3, max: 50 }).withMessage('Each enrollment number must be between 3 and 50 characters')
    .matches(/^[A-Z0-9]+$/i).withMessage('Each enrollment number must contain only letters and numbers'),

  validate,
];

module.exports = {
  bulkCreateUsersValidation,
};