const jwt = require('jsonwebtoken');
const User = require('../models/user.model');

const resolveToken = (req) => {
  const authHeader = req.headers.authorization || req.headers.Authorization;
  const bearerToken = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
  const cookieToken = req.cookies?.auth_token || null;
  return bearerToken || cookieToken;
};

const verifyToken = async (req, res, next) => {
  const token = resolveToken(req);
  if (!token) {
    res.status(401);
    return next(new Error('No token provided'));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select('-password');
    if (!req.user) {
      res.status(401);
      return next(new Error('User not found'));
    }
    if (req.user.isActive === false) {
      res.status(403);
      return next(new Error('Your account has been deactivated. Please contact your administrator.'));
    }
    next();
  } catch (err) {
    res.status(401);
    next(new Error('Invalid or expired token'));
  }
};

const optionalVerifyToken = async (req, res, next) => {
  const token = resolveToken(req);
  if (!token) {
    return next();
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    if (user && user.isActive !== false) {
      req.user = user;
    }
  } catch (err) {
    // Ignore invalid optional auth and continue as anonymous.
  }

  next();
};

const authorizeRoles = (...allowedRoles) => (req, res, next) => {
  if (!req.user) {
    res.status(401);
    return next(new Error('Not authenticated'));
  }
  if (!allowedRoles.includes(req.user.role)) {
    res.status(403);
    return next(new Error('Forbidden'));
  }
  next();
};

module.exports = { verifyToken, optionalVerifyToken, authorizeRoles };
