const express = require('express');
const { selfRegistrationDisabled, login } = require('../controllers/auth.controller');
const { loginValidation } = require('../middleware/validators/auth.validator');
const router = express.Router();

router.post('/register', selfRegistrationDisabled);
router.post('/login', loginValidation, login);

module.exports = router;
