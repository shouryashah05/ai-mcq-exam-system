const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const User = require('../models/user.model');
const { normalizeUserIdentity, serializeUser } = require('../utils/userIdentity');
const { generateToken, sendAccountSetupEmail, sendPasswordResetEmail } = require('../services/email.service');

const buildEnrollmentNo = () => {
  const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `AUTO${Date.now().toString(36).toUpperCase().slice(-5)}${rand}`.toUpperCase();
};

const buildPlaceholderPassword = () => `Invite#${crypto.randomBytes(8).toString('hex')}`;
const MAX_BULK_USERS = 500;

const normalizeBoolean = (value) => value === true || value === 'true';

const buildCreationMessage = (role, inviteMode) => {
  const roleLabel = role === 'admin' ? 'Admin' : 'User';
  if (inviteMode === 'setup') {
    return `${roleLabel} account created and setup email sent.`;
  }
  if (inviteMode === 'invite') {
    return `${roleLabel} account created, temporary password set, and invite email sent.`;
  }
  return `${roleLabel} account created successfully.`;
};

const prepareUserData = ({ name, firstName, lastName, email, password, role = 'student', enrollmentNo, sendInvite = false }) => {
  const normalizedIdentity = normalizeUserIdentity({ name, firstName, lastName });
  return {
    normalizedIdentity,
    normalizedEmail: typeof email === 'string' ? email.trim().toLowerCase() : '',
    normalizedPassword: typeof password === 'string' ? password.trim() : '',
    normalizedRole: role === 'admin' ? 'admin' : 'student',
    normalizedEnrollment: enrollmentNo ? enrollmentNo.trim().toUpperCase() : buildEnrollmentNo(),
    shouldSendInvite: normalizeBoolean(sendInvite),
  };
};

const ensureUserUniqueness = async ({ normalizedEmail, normalizedEnrollment }) => {
  const existingEnrollment = await User.findOne({ enrollmentNo: normalizedEnrollment });
  if (existingEnrollment) {
    const error = new Error('User with this enrollment number already exists');
    error.statusCode = 409;
    throw error;
  }

  const existingEmail = await User.findOne({ email: normalizedEmail });
  if (existingEmail) {
    const error = new Error('User with this email already exists');
    error.statusCode = 409;
    throw error;
  }
};

const issuePasswordAccessLink = async (user, mode = 'setup') => {
  const token = generateToken();
  user.resetPasswordToken = token;
  user.resetPasswordExpires = new Date(Date.now() + ((mode === 'setup' || mode === 'invite') ? 24 * 3600000 : 3600000));
  await user.save();

  if (process.env.NODE_ENV === 'test') {
    return token;
  }

  const displayName = user.name;
  if (mode === 'setup' || mode === 'invite') {
    await sendAccountSetupEmail(user.email, token, displayName);
  } else {
    await sendPasswordResetEmail(user.email, token, displayName);
  }

  return null;
};

const createManagedUser = async (payload, options = {}) => {
  const prepared = prepareUserData(payload);

  if (!prepared.normalizedIdentity.name || !prepared.normalizedEmail || (!prepared.normalizedPassword && !prepared.shouldSendInvite)) {
    const error = new Error('First name, last name, email, and either a password or setup invite are required');
    error.statusCode = 400;
    throw error;
  }

  await ensureUserUniqueness(prepared);

  const salt = await bcrypt.genSalt(10);
  const effectivePassword = prepared.normalizedPassword || buildPlaceholderPassword();
  const hashed = await bcrypt.hash(effectivePassword, salt);
  const inviteMode = prepared.shouldSendInvite
    ? (prepared.normalizedPassword ? 'invite' : 'setup')
    : null;

  const user = await User.create({
    name: prepared.normalizedIdentity.name,
    firstName: prepared.normalizedIdentity.firstName,
    lastName: prepared.normalizedIdentity.lastName,
    email: prepared.normalizedEmail,
    password: hashed,
    role: prepared.normalizedRole,
    enrollmentNo: prepared.normalizedEnrollment,
    isVerified: Boolean(prepared.normalizedPassword),
    verificationToken: null,
    isActive: true,
  });

  let passwordLinkToken = null;
  if (inviteMode) {
    try {
      passwordLinkToken = await issuePasswordAccessLink(user, inviteMode);
    } catch (error) {
      if (options.rollbackOnInviteFailure !== false) {
        await User.findByIdAndDelete(user._id);
      }
      const inviteError = new Error(inviteMode === 'setup'
        ? 'Failed to send setup email. User was not created.'
        : 'Failed to send invite email. User was not created.');
      inviteError.statusCode = 500;
      throw inviteError;
    }
  }

  return {
    user,
    passwordLinkToken,
    inviteMode,
    normalizedRole: prepared.normalizedRole,
  };
};

const createUser = async (req, res, next) => {
  try {
    const result = await createManagedUser(req.body);

    const response = {
      user: serializeUser(result.user),
      message: buildCreationMessage(result.normalizedRole, result.inviteMode),
    };

    if (result.passwordLinkToken) {
      response.inviteToken = result.passwordLinkToken;
    }

    res.status(201).json(response);
  } catch (err) {
    if (err.statusCode) {
      res.status(err.statusCode);
    }
    next(err);
  }
};

const bulkCreateUsers = async (req, res, next) => {
  try {
    const { users, temporaryPassword, sendInvite = false } = req.body;
    if (!Array.isArray(users) || users.length === 0) {
      res.status(400);
      throw new Error('Users must be a non-empty array');
    }

    if (users.length > MAX_BULK_USERS) {
      res.status(400);
      throw new Error(`Bulk import supports up to ${MAX_BULK_USERS} users per upload`);
    }

    const seenEmails = new Set();
    const seenEnrollments = new Set();
    const createdUsers = [];
    const errors = [];

    for (let index = 0; index < users.length; index += 1) {
      const row = users[index];
      const prepared = prepareUserData({ ...row, password: temporaryPassword, sendInvite });
      const rowNumber = index + 2;

      if (!prepared.normalizedIdentity.firstName || !prepared.normalizedIdentity.lastName || !prepared.normalizedEmail) {
        errors.push({ row: rowNumber, email: row?.email || '', message: 'First name, last name, and email are required' });
        continue;
      }

      if (seenEmails.has(prepared.normalizedEmail)) {
        errors.push({ row: rowNumber, email: prepared.normalizedEmail, message: 'Duplicate email in import file' });
        continue;
      }

      if (seenEnrollments.has(prepared.normalizedEnrollment)) {
        errors.push({ row: rowNumber, email: prepared.normalizedEmail, message: 'Duplicate enrollment number in import file' });
        continue;
      }

      seenEmails.add(prepared.normalizedEmail);
      seenEnrollments.add(prepared.normalizedEnrollment);

      try {
        const result = await createManagedUser({
          ...row,
          password: temporaryPassword,
          sendInvite,
        });

        createdUsers.push({
          row: rowNumber,
          user: serializeUser(result.user),
          inviteMode: result.inviteMode,
          passwordLinkToken: result.passwordLinkToken || undefined,
        });
      } catch (error) {
        errors.push({
          row: rowNumber,
          email: prepared.normalizedEmail,
          message: error.message,
        });
      }
    }

    const response = {
      createdCount: createdUsers.length,
      failedCount: errors.length,
      createdUsers,
      errors,
      message: `Bulk import finished. Created ${createdUsers.length} account(s) and failed ${errors.length}.`,
    };

    res.status(createdUsers.length > 0 ? 201 : 400).json(response);
  } catch (err) {
    next(err);
  }
};

const sendUserPasswordLink = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    if (!user) {
      res.status(404);
      throw new Error('User not found');
    }

    const mode = user.isVerified ? 'reset' : 'setup';
    const token = await issuePasswordAccessLink(user, mode);
    const response = {
      message: mode === 'setup'
        ? 'Account setup email sent successfully.'
        : 'Password reset email sent successfully.',
    };

    if (token) {
      response.resetToken = token;
    }

    res.json(response);
  } catch (err) {
    next(err);
  }
};

const getUsers = async (req, res, next) => {
  try {
    const users = await User.find().select('-password');
    res.json({ users: users.map(serializeUser) });
  } catch (err) {
    next(err);
  }
};

const updateUserRole = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { role } = req.body;
    if (!['student', 'admin'].includes(role)) {
      res.status(400);
      throw new Error('Invalid role');
    }
    const user = await User.findByIdAndUpdate(id, { role }, { new: true }).select('-password');
    if (!user) {
      res.status(404);
      throw new Error('User not found');
    }
    res.json({ user: serializeUser(user) });
  } catch (err) {
    next(err);
  }
};

const toggleUserStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    if (!user) {
      res.status(404);
      throw new Error('User not found');
    }
    user.isActive = !user.isActive;
    await user.save();
    res.json({ user: serializeUser(user) });
  } catch (err) {
    next(err);
  }
};

module.exports = { createUser, bulkCreateUsers, getUsers, updateUserRole, toggleUserStatus, sendUserPasswordLink };
