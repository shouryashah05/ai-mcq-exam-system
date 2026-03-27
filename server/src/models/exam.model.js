const mongoose = require('mongoose');

const examLabBatchAssignmentSchema = new mongoose.Schema({
  className: { type: String, trim: true, default: '' },
  labBatchName: { type: String, trim: true, default: '' },
}, { _id: false });

const examSchema = new mongoose.Schema({
  title: { type: String, required: true },
  examType: { type: String, enum: ['standard', 'adaptive'], default: 'standard' },
  subject: { type: String, default: 'General' }, // 'DBMS', 'OS', 'Aptitude', 'Mixed', etc.
  description: { type: String, default: '' },
  duration: { type: Number, required: true },
  totalMarks: { type: Number, required: true },
  passingMarks: { type: Number, required: true },
  questions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Question' }],
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  isActive: { type: Boolean, default: true },
  enableNegativeMarking: { type: Boolean, default: false }, // Enable negative marking for this exam
  assignedClasses: { type: [String], default: [] },
  assignedLabBatches: { type: [examLabBatchAssignmentSchema], default: [] },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Exam', examSchema);
