const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/user.model');
const { getCookieOptions } = require('../config/env');
const logger = require('../utils/logger');
const { buildEnrollmentNo, normalizeRoleIdentifier, normalizeUserIdentity, serializeUser } = require('../utils/userIdentity');
const { queueVerificationEmail } = require('../services/email.service');

const signAuthToken = (user) => jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
  expiresIn: process.env.JWT_EXPIRES_IN || '30d',
});

const attachAuthCookie = (res, token) => {
  res.cookie('auth_token', token, getCookieOptions());
};

const clearAuthCookie = (res) => {
  res.clearCookie('auth_token', { ...getCookieOptions(), maxAge: undefined });
};

const selfRegistrationDisabled = async (req, res, next) => {
  try {
    res.status(403);
    throw new Error('Self-signup is disabled. Please contact your administrator to create an account.');
  } catch (err) {
    next(err);
  }
};

const register = async (req, res, next) => {
  try {
    let { name, firstName, lastName, email, password, role = 'student', enrollmentNo } = req.body;
    const normalizedIdentity = normalizeUserIdentity({ name, firstName, lastName });
    if (!normalizedIdentity.name || !email || !password) {
      res.status(400);
      throw new Error('First name, last name, email, and password are required');
    }

    // Auto-generate enrollmentNo for students if not provided (convenient for tests/dev)
    if (!enrollmentNo) {
      enrollmentNo = buildEnrollmentNo();
    }

    // Prevent open admin registration unless explicitly allowed via env
    if (role !== 'student') {
      res.status(403);
      throw new Error('Only student self-registration is allowed');
    }

    // Check for duplicate enrollment number (primary key)
    const existingEnrollment = await User.findOne({ enrollmentNo: enrollmentNo.toUpperCase() });
    if (existingEnrollment) {
      res.status(409);
      throw new Error('User with this enrollment number already exists');
    }

    // Check for duplicate email (still need unique emails for verification)
    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      res.status(409);
      throw new Error('User with this email already exists');
    }

    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash(password, salt);

    // Generate verification token
    const crypto = require('crypto');
    const verificationToken = crypto.randomBytes(32).toString('hex');

    const user = await User.create({
      name: normalizedIdentity.name,
      firstName: normalizedIdentity.firstName,
      lastName: normalizedIdentity.lastName,
      email,
      password: hashed,
      role,
      enrollmentNo,
      verificationToken,
      isVerified: false // Require email verification for students
    });

    // Send verification email (only for students, admins are pre-verified)
    if (role !== 'admin') {
      try {
        await queueVerificationEmail(user.email, verificationToken, normalizedIdentity.name);
      } catch (emailError) {
        logger.warn('Failed to queue verification email', { error: emailError, email: user.email });
        // Don't fail registration if email fails, but log it
      }
    } else {
      // Admins are automatically verified
      user.isVerified = true;
      user.verificationToken = null;
      await user.save();
    }

    // Only return token for verified users (admins)
    // Students must verify email first before they can login
    if (user.isVerified || process.env.NODE_ENV === 'test') {
      // In test mode, auto-verify to simplify integration tests
      if (!user.isVerified) {
        user.isVerified = true;
        user.verificationToken = null;
        await user.save();
      }

      const token = signAuthToken(user);
      attachAuthCookie(res, token);

      res.status(201).json({
        user: serializeUser(user),
        token,
        message: 'Registration successful.'
      });
    } else {
      // Student registration - no token until verified
      res.status(201).json({
        user: serializeUser(user),
        message: 'Registration successful! Please check your email to verify your account before logging in.'
      });
    }
  } catch (err) {
    next(err);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400);
      throw new Error('Email, enrollment number, employee ID, or admin ID and password are required');
    }

    const normalizedIdentifier = normalizeRoleIdentifier(email);

    // Find user by email, enrollment number, employee ID, or admin ID.
    const user = await User.findOne({
      $or: [
        { email: email },
        { enrollmentNo: normalizedIdentifier },
        { employeeId: normalizedIdentifier },
        { adminId: normalizedIdentifier },
      ]
    });

    if (!user) {
      res.status(401);
      throw new Error('Invalid credentials');
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      res.status(401);
      throw new Error('Invalid credentials');
    }

    if (user.isActive === false) {
      res.status(403);
      throw new Error('Your account has been deactivated. Please contact your administrator.');
    }

    // Check if email is verified (only for students)
    if (user.role !== 'admin' && !user.isVerified) {
      res.status(403);
      throw new Error('Please verify your email before logging in. Check your inbox for the verification link.');
    }

    const token = signAuthToken(user);
    attachAuthCookie(res, token);

    res.json({
      user: serializeUser(user),
      token,
    });
  } catch (err) {
    next(err);
  }
};

const getCurrentSessionUser = async (req, res) => {
  res.json({ user: serializeUser(req.user) });
};

const logout = async (req, res) => {
  clearAuthCookie(res);
  res.json({ message: 'Logged out successfully.' });
};

module.exports = { register, login, selfRegistrationDisabled, getCurrentSessionUser, logout };
