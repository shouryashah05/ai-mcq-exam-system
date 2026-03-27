const mongoose = require('mongoose');

const labBatchSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  capacity: { type: Number, default: 0, min: 0 },
}, { _id: true });

const academicClassSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, unique: true },
  capacity: { type: Number, default: 0, min: 0 },
  description: { type: String, default: '', trim: true },
  labBatches: { type: [labBatchSchema], default: [] },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('AcademicClass', academicClassSchema);