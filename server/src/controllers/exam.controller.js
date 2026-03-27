const Exam = require('../models/exam.model');
const Question = require('../models/question.model');
const { ensureResourceOwnerOrAdmin, getManagedSubjects, isTeacher } = require('../utils/permissions');
const { isExamVisibleToStudent, normalizeExamAudience, validateTeacherExamAudience } = require('../utils/examAudience');

const sortLatestExamsFirst = (left, right) => {
  const leftCreatedAt = new Date(left?.createdAt || left?.startDate || 0).getTime();
  const rightCreatedAt = new Date(right?.createdAt || right?.startDate || 0).getTime();
  return rightCreatedAt - leftCreatedAt;
};

const failValidation = (res, message) => {
  res.status(400);
  throw new Error(message);
};

const normalizeQuestionIds = (questions = []) => {
  if (!Array.isArray(questions)) return [];

  return Array.from(new Set(
    questions
      .map((question) => {
        if (typeof question === 'string') return question;
        if (question && typeof question === 'object') return question.questionId || question._id;
        return question;
      })
      .filter(Boolean)
      .map((questionId) => questionId.toString())
  ));
};

const buildExamPayload = async (res, source, user) => {
  const title = typeof source.title === 'string' ? source.title.trim() : '';
  const subject = typeof source.subject === 'string' ? source.subject.trim() : '';
  const description = typeof source.description === 'string' ? source.description.trim() : '';
  const duration = Number(source.duration);
  const passingMarks = Number(source.passingMarks);
  const questionIds = normalizeQuestionIds(source.questions);
  const startDate = new Date(source.startDate);
  const endDate = new Date(source.endDate);
  const audience = normalizeExamAudience(source);

  if (!title) failValidation(res, 'Exam title is required');
  if (title.length < 5) failValidation(res, 'Title must be at least 5 characters long');
  if (!subject) failValidation(res, 'Subject is required');
  if (!Number.isInteger(duration) || duration <= 0 || duration > 180) failValidation(res, 'Duration must be between 1 and 180 minutes');
  if (!questionIds.length) failValidation(res, 'At least one question must be assigned to the exam');
  if (Number.isNaN(startDate.getTime())) failValidation(res, 'Start date must be valid');
  if (Number.isNaN(endDate.getTime())) failValidation(res, 'End date must be valid');
  if (endDate <= startDate) failValidation(res, 'End date must be after start date');

  const questions = await Question.find({ _id: { $in: questionIds } }, 'marks subject createdBy');
  if (questions.length !== questionIds.length) {
    failValidation(res, 'One or more selected questions do not exist');
  }

  if (isTeacher(user)) {
    const teacherSubjects = getManagedSubjects(user);
    if (teacherSubjects.length === 0) {
      failValidation(res, 'Teachers must have at least one assigned subject to create exams');
    }

    if (!teacherSubjects.includes(subject)) {
      failValidation(res, 'Teachers can only create exams for assigned subjects');
    }

    const hasQuestionOutsideSelectedSubject = questions.some((question) => question.subject !== subject);
    if (hasQuestionOutsideSelectedSubject) {
      failValidation(res, 'Teachers can only create exams with questions from the selected assigned subject');
    }

    try {
      Object.assign(audience, validateTeacherExamAudience(user, audience));
    } catch (error) {
      failValidation(res, error.message);
    }
  }

  const totalMarks = questions.reduce((sum, question) => sum + (Number(question.marks) || 1), 0);
  if (!Number.isInteger(totalMarks) || totalMarks <= 0) {
    failValidation(res, 'Selected questions must produce a positive total mark');
  }

  if (!Number.isInteger(passingMarks) || passingMarks < 0) {
    failValidation(res, 'Passing marks must be a non-negative integer');
  }

  if (passingMarks > totalMarks) {
    failValidation(res, 'Passing marks cannot exceed total marks');
  }

  return {
    title,
    subject,
    description,
    duration,
    totalMarks,
    passingMarks,
    questions: questionIds,
    startDate,
    endDate,
    isActive: typeof source.isActive === 'boolean' ? source.isActive : true,
    enableNegativeMarking: Boolean(source.enableNegativeMarking),
    assignedClasses: audience.assignedClasses,
    assignedLabBatches: audience.assignedLabBatches,
  };
};

const createExam = async (req, res, next) => {
  try {
    const payload = await buildExamPayload(res, req.body, req.user);
    const exam = await Exam.create({
      ...payload,
      createdBy: req.user._id
    });
    await exam.populate('questions', 'questionText marks subject difficulty topic questionImageUrl');
    await exam.populate('createdBy', 'name email role');
    console.info('[exam.create]', {
      id: exam._id.toString(),
      title: exam.title,
      subject: exam.subject,
      questionCount: exam.questions.length,
      isActive: exam.isActive,
      startDate: exam.startDate,
      endDate: exam.endDate,
      assignedClasses: exam.assignedClasses,
      assignedLabBatches: exam.assignedLabBatches,
    });
    res.status(201).json({ exam });
  } catch (err) {
    next(err);
  }
};

const getExams = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.mine === 'true' && isTeacher(req.user)) {
      filter.createdBy = req.user._id;
    }

    const exams = await Exam.find(filter)
      .sort({ createdAt: -1, startDate: -1, _id: -1 })
      .populate('questions', 'questionText marks subject difficulty topic questionImageUrl')
      .populate('createdBy', 'name email role');

    const visibleExams = req.user?.role === 'student'
      ? exams.filter((exam) => isExamVisibleToStudent(exam, req.user))
      : exams;

    res.json({ exams: visibleExams.sort(sortLatestExamsFirst) });
  } catch (err) {
    next(err);
  }
};

const getExamById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const exam = await Exam.findById(id)
      .populate('questions', 'questionText options marks subject difficulty topic questionImageUrl')
      .populate('createdBy', 'name email role');
    if (!exam) {
      res.status(404);
      throw new Error('Exam not found');
    }

    if (req.user?.role === 'student' && !isExamVisibleToStudent(exam, req.user)) {
      res.status(404);
      throw new Error('Exam not found');
    }

    res.json({ exam });
  } catch (err) {
    next(err);
  }
};

const updateExam = async (req, res, next) => {
  try {
    const { id } = req.params;
    const exam = await Exam.findById(id);
    if (!exam) {
      res.status(404);
      throw new Error('Exam not found');
    }

    ensureResourceOwnerOrAdmin(req.user, exam);

    const payload = await buildExamPayload(res, {
      title: req.body.title ?? exam.title,
      subject: req.body.subject ?? exam.subject,
      description: req.body.description ?? exam.description,
      duration: req.body.duration ?? exam.duration,
      passingMarks: req.body.passingMarks ?? exam.passingMarks,
      questions: req.body.questions ?? exam.questions,
      startDate: req.body.startDate ?? exam.startDate,
      endDate: req.body.endDate ?? exam.endDate,
      assignedClasses: req.body.assignedClasses ?? exam.assignedClasses,
      assignedLabBatches: req.body.assignedLabBatches ?? exam.assignedLabBatches,
      isActive: req.body.isActive ?? exam.isActive,
      enableNegativeMarking: req.body.enableNegativeMarking ?? exam.enableNegativeMarking
    }, req.user);

    Object.assign(exam, payload);
    await exam.save();
    await exam.populate('questions', 'questionText marks subject difficulty topic questionImageUrl');
    await exam.populate('createdBy', 'name email role');
    res.json({ exam });
  } catch (err) {
    next(err);
  }
};

const deleteExam = async (req, res, next) => {
  try {
    const { id } = req.params;
    const exam = await Exam.findById(id);
    if (!exam) {
      res.status(404);
      throw new Error('Exam not found');
    }

    ensureResourceOwnerOrAdmin(req.user, exam);

    await Exam.findByIdAndDelete(id);
    res.json({ message: 'Exam deleted' });
  } catch (err) {
    next(err);
  }
};

module.exports = { createExam, getExams, getExamById, updateExam, deleteExam };
