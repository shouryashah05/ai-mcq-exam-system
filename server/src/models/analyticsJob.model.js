const mongoose = require('mongoose');

const analyticsJobSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  attemptId: { type: mongoose.Schema.Types.ObjectId, required: true, unique: true, index: true },
  status: { type: String, enum: ['pending', 'processing', 'done', 'failed'], default: 'pending' },
  error: { type: String, default: '' },
  attempts: { type: Number, default: 0 },
  maxAttempts: { type: Number, default: 3 },
  availableAt: { type: Date, default: Date.now, index: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

analyticsJobSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

analyticsJobSchema.index({ status: 1, availableAt: 1, createdAt: 1 });

module.exports = mongoose.model('AnalyticsJob', analyticsJobSchema);
