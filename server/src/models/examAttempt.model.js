const mongoose = require('mongoose');

const examAttemptSnapshotSchema = new mongoose.Schema({
  examId: { type: String, default: '' },
  title: { type: String, default: 'Exam' },
  examType: { type: String, default: 'standard' },
  subject: { type: String, default: 'General' },
  description: { type: String, default: '' },
  duration: { type: Number, default: 0 },
  totalMarks: { type: Number, default: 0 },
  passingMarks: { type: Number, default: 0 },
  enableNegativeMarking: { type: Boolean, default: false },
  startDate: { type: Date, default: null },
  endDate: { type: Date, default: null },
}, { _id: false });

const examAttemptSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  exam: { type: mongoose.Schema.Types.ObjectId, ref: 'Exam' }, // Optional for adaptive mode
  examSnapshot: { type: examAttemptSnapshotSchema, default: null },
  mode: { type: String, enum: ['standard', 'adaptive'], default: 'standard' },
  answers: [{
    questionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Question' },
    selectedOption: { type: Number, default: null },
    shuffledOptions: { type: [String], default: [] },
    optionOrder: { type: [Number], default: [] },
    correctOptionIndex: { type: Number, default: null },
    isCorrect: { type: Boolean, default: null },
    marksAwarded: { type: Number, default: 0 },
    timeSpentSeconds: { type: Number, default: 0 },
    subject: { type: String }, // Snapshot for historical accuracy
    topic: { type: String }    // Snapshot for historical accuracy
  }],
  score: { type: Number, default: 0 },
  status: { type: String, enum: ['in-progress', 'completed'], default: 'in-progress' },
  startTime: { type: Date, required: true },
  endTime: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('ExamAttempt', examAttemptSchema);
