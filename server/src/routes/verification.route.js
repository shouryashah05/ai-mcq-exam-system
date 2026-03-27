const express = require('express');
const {
    verifyEmail,
    resendVerificationEmail,
    requestPasswordReset,
    resetPassword
} = require('../controllers/verification.controller');
const { emailValidation, passwordResetValidation } = require('../middleware/validators/auth.validator');
const { passwordResetRateLimiter, verificationRateLimiter } = require('../middleware/rateLimit');

const router = express.Router();

// Email verification
router.get('/verify-email', verifyEmail);
router.post('/resend-verification', verificationRateLimiter, emailValidation, resendVerificationEmail);

// Password reset
router.post('/request-password-reset', passwordResetRateLimiter, emailValidation, requestPasswordReset);
router.post('/reset-password', passwordResetValidation, resetPassword);

module.exports = router;
