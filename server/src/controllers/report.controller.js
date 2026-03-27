const ExamAttempt = require('../models/examAttempt.model');
const Exam = require('../models/exam.model');
const {
  getReportStudentsForScope,
  getStudentOverallReport,
  getStudentSubjectHistoryReport,
  getSubjectWiseStudentReport,
} = require('../services/reporting.service');
const { ensureTeacherSubjectAccess, getManagedClasses, getManagedLabBatchAssignments, getManagedSubjects, isTeacher } = require('../utils/permissions');

const buildReportScope = async (user) => {
  if (!isTeacher(user)) {
    return null;
  }

  const ownedExams = await Exam.find({ createdBy: user._id }).select('_id subject');
  return {
    examIds: ownedExams.map((exam) => exam._id),
    subjects: getManagedSubjects(user),
    classes: getManagedClasses(user),
    batches: getManagedClasses(user),
    labBatchAssignments: getManagedLabBatchAssignments(user),
  };
};

const withTeacherExamFilter = async (req, filter = {}) => {
  const scope = await buildReportScope(req.user);
  if (!scope) {
    if (req.query.examId) {
      return { ...filter, exam: req.query.examId };
    }
    return filter;
  }

  if (req.query.examId) {
    const match = scope.examIds.some((examId) => String(examId) === String(req.query.examId));
    if (!match) {
      const error = new Error('Forbidden');
      error.statusCode = 403;
      throw error;
    }
    return { ...filter, exam: req.query.examId };
  }

  return { ...filter, exam: { $in: scope.examIds } };
};

const getReportStudents = async (req, res, next) => {
  try {
    const scope = await buildReportScope(req.user);
    const students = await getReportStudentsForScope({ scope });
    res.json({ students });
  } catch (err) {
    next(err);
  }
};

const getStudentPerformance = async (req, res, next) => {
  try {
    const filter = await withTeacherExamFilter(req, { status: 'completed' });

    const attempts = await ExamAttempt.find(filter)
      .populate('user', 'name email role')
      .populate('exam', 'title totalMarks passingMarks')
      .sort({ endTime: -1 });

    const performance = attempts.filter((attempt) => attempt.user?.role === 'student').map(a => ({
      _id: a._id,
      studentName: a.user.name,
      studentEmail: a.user.email,
      examTitle: a.exam.title,
      score: a.score,
      totalMarks: a.exam.totalMarks,
      percentage: ((a.score / a.exam.totalMarks) * 100).toFixed(2),
      passed: a.score >= a.exam.passingMarks,
      completedAt: a.endTime
    }));

    res.json({ performance });
  } catch (err) {
    next(err);
  }
};

const getExamStatistics = async (req, res, next) => {
  try {
    const filter = await withTeacherExamFilter(req, { status: 'completed' });

    const attempts = await ExamAttempt.find(filter).populate('exam', 'title totalMarks passingMarks');

    if (!attempts.length) {
      return res.json({
        total: 0,
        passed: 0,
        failed: 0,
        avgScore: 0,
        avgPercentage: 0
      });
    }

    const total = attempts.length;
    const passed = attempts.filter(a => a.score >= a.exam.passingMarks).length;
    const failed = total - passed;
    const totalScore = attempts.reduce((sum, a) => sum + a.score, 0);
    const avgScore = (totalScore / total).toFixed(2);
    const avgPercentage = attempts.reduce((sum, a) => sum + ((a.score / a.exam.totalMarks) * 100), 0) / total;

    res.json({
      total,
      passed,
      failed,
      avgScore,
      avgPercentage: avgPercentage.toFixed(2),
      passPercentage: ((passed / total) * 100).toFixed(2)
    });
  } catch (err) {
    next(err);
  }
};

const getSubjectStudentsReport = async (req, res, next) => {
  try {
    const { subject, startDate, endDate } = req.query;
    if (!subject) {
      res.status(400);
      throw new Error('Subject is required');
    }

    if (isTeacher(req.user)) {
      ensureTeacherSubjectAccess(req.user, subject);
    }

    const scope = await buildReportScope(req.user);
    const report = await getSubjectWiseStudentReport({ subject, startDate, endDate, scope });
    res.json({ success: true, data: report });
  } catch (err) {
    next(err);
  }
};

const getStudentSubjectHistory = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { subject, startDate, endDate } = req.query;
    if (!subject) {
      res.status(400);
      throw new Error('Subject is required');
    }

    if (isTeacher(req.user)) {
      ensureTeacherSubjectAccess(req.user, subject);
    }

    const scope = await buildReportScope(req.user);
    const report = await getStudentSubjectHistoryReport({ userId, subject, startDate, endDate, scope });
    if (!report) {
      res.status(404);
      throw new Error('Student not found');
    }

    res.json({ success: true, data: report });
  } catch (err) {
    next(err);
  }
};

const getStudentOverall = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { startDate, endDate } = req.query;
    const scope = await buildReportScope(req.user);
    const report = await getStudentOverallReport({ userId, startDate, endDate, scope });
    if (!report) {
      res.status(404);
      throw new Error('Student not found');
    }

    res.json({ success: true, data: report });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getReportStudents,
  getStudentPerformance,
  getExamStatistics,
  getSubjectStudentsReport,
  getStudentSubjectHistory,
  getStudentOverall,
};
