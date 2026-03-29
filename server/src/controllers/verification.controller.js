const User = require('../models/user.model');
const { queueVerificationEmail, queuePasswordResetEmail, queueAccountSetupEmail } = require('../services/email.service');
const { buildFullName } = require('../utils/userIdentity');
const { buildHashedTokenLookup, createTokenRecord } = require('../utils/tokenSecurity');

/**
 * Verify user email with token
 */
const verifyEmail = async (req, res, next) => {
    try {
        const { token } = req.query;

        if (!token) {
            res.status(400);
            throw new Error('Verification token is required');
        }

        const user = await User.findOne(buildHashedTokenLookup('verificationToken', token));

        if (!user) {
            res.status(400);
            throw new Error('Invalid or expired verification token');
        }

        // Mark user as verified
        user.isVerified = true;
        user.verificationToken = null;
        await user.save();

        res.json({ message: 'Email verified successfully. You can now login.' });
    } catch (err) {
        next(err);
    }
};

/**
 * Resend verification email
 */
const resendVerificationEmail = async (req, res, next) => {
    try {
        const { email } = req.body;
        const genericMessage = 'If the email exists and still needs verification, a verification email has been sent';

        if (!email) {
            res.status(400);
            throw new Error('Email is required');
        }

        const user = await User.findOne({ email });

        if (!user || user.isVerified) {
            return res.json({ message: genericMessage });
        }

        // Generate new token
        const verificationToken = createTokenRecord();
        user.verificationToken = verificationToken.hashedToken;
        await user.save();

        // Send verification email
        await queueVerificationEmail(user.email, verificationToken.rawToken, user.name);

        res.json({ message: genericMessage });
    } catch (err) {
        next(err);
    }
};

/**
 * Request password reset
 */
const requestPasswordReset = async (req, res, next) => {
    try {
        const { email } = req.body;

        if (!email) {
            res.status(400);
            throw new Error('Email is required');
        }

        const user = await User.findOne({ email });

        if (!user) {
            // Don't reveal if user exists or not for security
            return res.json({ message: 'If the email exists, a password reset link has been sent' });
        }

        // Generate reset token
        const resetToken = createTokenRecord();
        user.resetPasswordToken = resetToken.hashedToken;
        user.resetPasswordExpires = new Date(Date.now() + 3600000); // 1 hour
        await user.save();

        const displayName = buildFullName(user.firstName, user.lastName) || user.name;

        if (process.env.NODE_ENV === 'test') {
            return res.json({
                message: 'If the email exists, a password reset link has been sent',
                resetToken: resetToken.rawToken,
            });
        }

        if (user.isVerified) {
            await queuePasswordResetEmail(user.email, resetToken.rawToken, displayName);
        } else {
            await queueAccountSetupEmail(user.email, resetToken.rawToken, displayName);
        }

        res.json({ message: 'If the email exists, a password reset link has been sent' });
    } catch (err) {
        next(err);
    }
};

/**
 * Reset password with token
 */
const resetPassword = async (req, res, next) => {
    try {
        const { token, newPassword } = req.body;

        if (!token || !newPassword) {
            res.status(400);
            throw new Error('Token and new password are required');
        }

        if (newPassword.length < 6) {
            res.status(400);
            throw new Error('Password must be at least 6 characters long');
        }

        const user = await User.findOne({
            ...buildHashedTokenLookup('resetPasswordToken', token),
            resetPasswordExpires: { $gt: Date.now() },
        });

        if (!user) {
            res.status(400);
            throw new Error('Invalid or expired reset token');
        }

        // Hash new password
        const bcrypt = require('bcryptjs');
        const salt = await bcrypt.genSalt(10);
        const wasVerified = user.isVerified;
        user.password = await bcrypt.hash(newPassword, salt);
        user.resetPasswordToken = null;
        user.resetPasswordExpires = null;
        user.isVerified = true;
        user.verificationToken = null;
        await user.save();

        res.json({
            message: wasVerified
                ? 'Password reset successfully. You can now login with your new password.'
                : 'Account setup complete. You can now login with your new password.',
        });
    } catch (err) {
        next(err);
    }
};

module.exports = {
    verifyEmail,
    resendVerificationEmail,
    requestPasswordReset,
    resetPassword,
};
