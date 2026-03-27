const express = require('express');
const { selfRegistrationDisabled, login, getCurrentSessionUser, logout } = require('../controllers/auth.controller');
const { verifyToken } = require('../middleware/auth');
const { loginValidation } = require('../middleware/validators/auth.validator');
const { authRateLimiter } = require('../middleware/rateLimit');
const router = express.Router();

router.post('/register', selfRegistrationDisabled);
router.post('/login', authRateLimiter, loginValidation, login);
router.get('/me', verifyToken, getCurrentSessionUser);
router.post('/logout', logout);

module.exports = router;
