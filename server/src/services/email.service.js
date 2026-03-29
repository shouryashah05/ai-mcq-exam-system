const nodemailer = require('nodemailer');
const EmailJob = require('../models/emailJob.model');
const logger = require('../utils/logger');
const { decryptToken, encryptToken, generateRawToken } = require('../utils/tokenSecurity');

/**
 * Email Service for sending verification and password reset emails
 */

// Create reusable transporter
const createTransporter = () => {
    return nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT) || 587,
        secure: false, // true for 465, false for other ports
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
    });
};

/**
 * Generate a random verification token
 */
const generateToken = () => generateRawToken();

const buildVerificationMailOptions = (email, token, name) => {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const verificationUrl = `${frontendUrl}/verify-email?token=${token}`;

    return {
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: email,
        subject: 'Verify Your Email - AI MCQ Exam System',
        html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Welcome to AI MCQ Exam System!</h2>
        <p>Hi ${name},</p>
        <p>Thank you for registering. Please verify your email address by clicking the button below:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationUrl}" 
             style="background-color: #4CAF50; color: white; padding: 12px 24px; 
                    text-decoration: none; border-radius: 4px; display: inline-block;">
            Verify Email
          </a>
        </div>
        <p>Or copy and paste this link in your browser:</p>
        <p style="color: #666; word-break: break-all;">${verificationUrl}</p>
        <p style="color: #999; font-size: 12px; margin-top: 30px;">
          This link will expire in 24 hours. If you didn't create an account, please ignore this email.
        </p>
      </div>
    `,
    };
};

const buildPasswordActionMailOptions = (email, token, name, options) => {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const resetUrl = `${frontendUrl}/reset-password?token=${token}`;

    return {
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: email,
        subject: options.subject,
        html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">${options.heading}</h2>
        <p>Hi ${name},</p>
        <p>${options.intro}</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" 
             style="background-color: #2196F3; color: white; padding: 12px 24px; 
                    text-decoration: none; border-radius: 4px; display: inline-block;">
            ${options.buttonText}
          </a>
        </div>
        <p>Or copy and paste this link in your browser:</p>
        <p style="color: #666; word-break: break-all;">${resetUrl}</p>
        <p style="color: #999; font-size: 12px; margin-top: 30px;">
          ${options.expiryText}
        </p>
      </div>
    `,
    };
};

const sendMailNow = async (mailOptions) => {
    const transporter = createTransporter();
    await transporter.sendMail(mailOptions);
    return true;
};

const enqueueEmailJob = async ({ type, recipient, token, name }) => {
    await EmailJob.create({
        type,
        recipient,
    token: encryptToken(token),
        name,
        status: 'pending',
        availableAt: new Date(),
    });
    return true;
};

/**
 * Send verification email to user
 * @param {string} email - User's email address
 * @param {string} token - Verification token
 * @param {string} name - User's name
 */
const sendVerificationEmail = async (email, token, name) => {
    try {
        await sendMailNow(buildVerificationMailOptions(email, token, name));
        logger.info('Verification email sent', { email });
        return true;
    } catch (error) {
        logger.error('Error sending verification email', { error, email });
        throw new Error('Failed to send verification email');
    }
};

/**
 * Send password reset email to user
 * @param {string} email - User's email address
 * @param {string} token - Reset token
 * @param {string} name - User's name
 */
const sendPasswordResetEmail = async (email, token, name) => {
  return sendPasswordActionEmail(email, token, name, {
    subject: 'Password Reset Request - AI MCQ Exam System',
    heading: 'Password Reset Request',
    intro: 'We received a request to reset your password. Click the button below to reset it:',
    buttonText: 'Reset Password',
    expiryText: 'This link will expire in 1 hour. If you didn\'t request a password reset, please ignore this email.',
  });
};

const sendAccountSetupEmail = async (email, token, name) => {
  return sendPasswordActionEmail(email, token, name, {
    subject: 'Set Up Your Account - AI MCQ Exam System',
    heading: 'Complete Your Account Setup',
    intro: 'An administrator created your account. Click the button below to set your password and activate access:',
    buttonText: 'Set Password',
    expiryText: 'This link will expire in 24 hours. If you were not expecting this invitation, you can ignore this email.',
  });
};

const sendPasswordActionEmail = async (email, token, name, options) => {
    try {
    await sendMailNow(buildPasswordActionMailOptions(email, token, name, options));
    logger.info('Password action email sent', { email, subject: options.subject });
        return true;
    } catch (error) {
    logger.error('Error sending password action email', { error, email, subject: options.subject });
        throw new Error('Failed to send password reset email');
    }
};

const queueVerificationEmail = async (email, token, name) => enqueueEmailJob({
  type: 'verification',
  recipient: email,
  token,
  name,
});

const queuePasswordResetEmail = async (email, token, name) => enqueueEmailJob({
  type: 'password-reset',
  recipient: email,
  token,
  name,
});

const queueAccountSetupEmail = async (email, token, name) => enqueueEmailJob({
  type: 'account-setup',
  recipient: email,
  token,
  name,
});

const processEmailJob = async (job) => {
  const token = decryptToken(job.token);

  if (job.type === 'verification') {
    await sendVerificationEmail(job.recipient, token, job.name);
    return;
  }

  if (job.type === 'password-reset') {
    await sendPasswordResetEmail(job.recipient, token, job.name);
    return;
  }

  if (job.type === 'account-setup') {
    await sendAccountSetupEmail(job.recipient, token, job.name);
    return;
  }

  throw new Error(`Unsupported email job type: ${job.type}`);
};

module.exports = {
    generateToken,
  processEmailJob,
  queueAccountSetupEmail,
  queuePasswordResetEmail,
  queueVerificationEmail,
    sendVerificationEmail,
    sendPasswordResetEmail,
  sendAccountSetupEmail,
};
