const mongoose = require('mongoose');

const emailJobSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['verification', 'password-reset', 'account-setup'],
    required: true,
    index: true,
  },
  recipient: { type: String, required: true, trim: true, lowercase: true, index: true },
  token: { type: String, required: true }, // Encrypted token payload for delayed email delivery
  name: { type: String, required: true, trim: true },
  status: { type: String, enum: ['pending', 'processing', 'done', 'failed'], default: 'pending', index: true },
  attempts: { type: Number, default: 0 },
  maxAttempts: { type: Number, default: 3 },
  availableAt: { type: Date, default: Date.now, index: true },
  lastError: { type: String, default: '' },
}, { timestamps: true });

emailJobSchema.index({ status: 1, availableAt: 1, createdAt: 1 });

module.exports = mongoose.model('EmailJob', emailJobSchema);