const ExamAttempt = require('../models/examAttempt.model');
const Exam = require('../models/exam.model');
const Question = require('../models/question.model');
const AnalyticsJob = require('../models/analyticsJob.model');
const PerformanceAnalyticsController = require('./performanceAnalytics.controller');
const { isExamVisibleToStudent } = require('../utils/examAudience');
const {
  buildShuffledOptionData,
  serializeAttemptForClient,
  shuffleArray,
} = require('../utils/questionPresentation');

const evaluateAnswers = async (exam, answers) => {
  let score = 0;
  const evaluated = [];
  let correctCount = 0;
  let wrongCount = 0;
  let unansweredCount = 0;

  for (const answer of answers) {
    const question = await Question.findById(answer.questionId);
    if (!question) continue;

    // Default values
    let isCorrect = false;
    let marksAwarded = 0;
    const subject = question.subject || 'Aptitude';
    const topic = question.topic || 'General';

    // Check if question was answered
    if (answer.selectedOption === null || answer.selectedOption === undefined) {
      unansweredCount++;
      evaluated.push({
        questionId: answer.questionId,
        questionText: question.questionText,
        options: Array.isArray(answer.shuffledOptions) && answer.shuffledOptions.length ? answer.shuffledOptions : question.options,
        selectedOption: null,
        correctAnswer: typeof answer.correctOptionIndex === 'number' ? answer.correctOptionIndex : question.correctAnswer,
        isCorrect: false,
        marks: question.marks,
        negativeMarks: question.negativeMarks,
        marksAwarded: 0,
        explanation: question.explanation,
        difficulty: question.difficulty,
        questionImageUrl: question.questionImageUrl,
        subject,
        topic,
        timeSpentSeconds: answer.timeSpentSeconds || 0
      });
      continue;
    }

    const correctAnswerIndex = typeof answer.correctOptionIndex === 'number' ? answer.correctOptionIndex : question.correctAnswer;
    isCorrect = answer.selectedOption === correctAnswerIndex;

    if (isCorrect) {
      marksAwarded = question.marks;
      score += question.marks;
      correctCount++;
    } else {
      // Apply negative marking if enabled for the exam
      if (exam.enableNegativeMarking && question.negativeMarks > 0) {
        marksAwarded = -question.negativeMarks;
        score -= question.negativeMarks;
      }
      wrongCount++;
    }

    evaluated.push({
      questionId: answer.questionId,
      questionText: question.questionText,
      options: Array.isArray(answer.shuffledOptions) && answer.shuffledOptions.length ? answer.shuffledOptions : question.options,
      selectedOption: answer.selectedOption,
      correctAnswer: correctAnswerIndex,
      isCorrect,
      marks: question.marks,
      negativeMarks: question.negativeMarks,
      marksAwarded, // Can be positive, negative, or zero
      explanation: question.explanation,
      difficulty: question.difficulty,
      questionImageUrl: question.questionImageUrl,
      subject,
      topic,
      timeSpentSeconds: answer.timeSpentSeconds || 0
    });
  }

  return {
    score,
    evaluated,
    stats: {
      correctCount,
      wrongCount,
      unansweredCount,
      totalQuestions: answers.length
    }
  };
};

const startExam = async (req, res, next) => {
  try {
    const { examId } = req.body;
    const exam = await Exam.findById(examId)
      .populate('questions')
      .populate('createdBy', 'role');
    if (!exam) {
      res.status(404);
      throw new Error('Exam not found');
    }

    if (exam.examType === 'adaptive' || exam.createdBy?.role === 'student') {
      res.status(400);
      throw new Error('Adaptive practice tests must be started from the adaptive practice flow');
    }

    if (req.user?.role === 'student' && !isExamVisibleToStudent(exam, req.user)) {
      res.status(404);
      throw new Error('Exam not found');
    }

    // Check if exam is active and within date range
    const now = new Date();
    if (!exam.isActive || now < exam.startDate || now > exam.endDate) {
      res.status(400);
      throw new Error('Exam is not available at this time');
    }

    // Check if already in progress or completed
    const existing = await ExamAttempt.findOne({
      user: req.user._id,
      exam: examId,
      status: 'in-progress'
    })
      .populate('exam')
      .populate({
        path: 'answers.questionId',
        select: 'questionText options category difficulty marks subject topic questionImageUrl'
      });
    if (existing) {
      return res.json({ attempt: serializeAttemptForClient(existing) });
    }

    // Randomize questions to prevent copying (SRS requirement: NFR-USR-03)
    const shuffledQuestions = shuffleArray(exam.questions);

    // Prepare answers array with shuffled questions
    const answers = shuffledQuestions.map((question) => ({
      questionId: question._id,
      selectedOption: null,
      ...buildShuffledOptionData(question),
      subject: question.subject,
      topic: question.topic,
    }));

    const attempt = await ExamAttempt.create({
      user: req.user._id,
      exam: examId,
      answers,
      startTime: new Date()
    });

    // Populate the attempt with shuffled questions
    const populatedAttempt = await ExamAttempt.findById(attempt._id)
      .populate({
        path: 'answers.questionId',
        select: 'questionText options category difficulty marks subject topic questionImageUrl'
      });

    res.status(201).json({ attempt: serializeAttemptForClient(populatedAttempt) });
  } catch (err) {
    next(err);
  }
};

const saveAnswer = async (req, res, next) => {
  try {
    const { attemptId } = req.params;
    const { questionId, selectedOption, timeSpentSeconds } = req.body;

    // Normalize incoming questionId which may be an object (populated) or a string
    let qid = questionId;
    try {
      if (typeof questionId === 'object' && questionId !== null) {
        qid = questionId._id ? questionId._id.toString() : questionId.toString();
      } else {
        qid = String(questionId);
      }
    } catch (e) {
      qid = String(questionId);
    }

    const attemptAnswer = await ExamAttempt.findOne(
      {
        _id: attemptId,
        user: req.user._id,
        status: 'in-progress',
        'answers.questionId': qid,
      },
      { 'answers.$': 1 },
    );

    if (!attemptAnswer?.answers?.length) {
      res.status(404);
      throw new Error('Question not found in this attempt');
    }

    const answerEntry = attemptAnswer.answers[0];
    const optionCount = Array.isArray(answerEntry.shuffledOptions) && answerEntry.shuffledOptions.length
      ? answerEntry.shuffledOptions.length
      : 0;

    const normalizedTimeSpentSeconds = timeSpentSeconds === undefined ? 0 : Number(timeSpentSeconds);
    if (!Number.isFinite(normalizedTimeSpentSeconds) || normalizedTimeSpentSeconds < 0) {
      res.status(400);
      throw new Error('timeSpentSeconds must be a non-negative number');
    }

    let normalizedSelectedOption = selectedOption;
    if (selectedOption !== null && selectedOption !== undefined) {
      normalizedSelectedOption = Number(selectedOption);
      if (!Number.isInteger(normalizedSelectedOption) || normalizedSelectedOption < 0 || normalizedSelectedOption >= optionCount) {
        res.status(400);
        throw new Error(`Selected option must be between 0 and ${optionCount - 1}`);
      }
    }

    const attemptQuery = {
      _id: attemptId,
      user: req.user._id,
      status: 'in-progress',
    };

    let attempt = await ExamAttempt.findOneAndUpdate(
      {
        ...attemptQuery,
        'answers.questionId': qid,
      },
      {
        $set: {
          'answers.$.selectedOption': normalizedSelectedOption,
        },
        ...(normalizedTimeSpentSeconds > 0 ? { $inc: { 'answers.$.timeSpentSeconds': normalizedTimeSpentSeconds } } : {}),
      },
      { new: true },
    );

    if (!attempt) {
      attempt = await ExamAttempt.findOneAndUpdate(
        {
          ...attemptQuery,
          'answers.questionId': { $ne: qid },
        },
        {
          $push: {
            answers: {
              questionId: qid,
              selectedOption: normalizedSelectedOption,
              timeSpentSeconds: normalizedTimeSpentSeconds,
            },
          },
        },
        { new: true },
      );
    }

    if (!attempt) {
      const existingAttempt = await ExamAttempt.findById(attemptId).select('user status');
      if (!existingAttempt || existingAttempt.user.toString() !== req.user._id.toString()) {
        res.status(403);
        throw new Error('Unauthorized');
      }

      res.status(400);
      throw new Error('Exam attempt is no longer accepting answers');
    }

    res.json({ attempt: serializeAttemptForClient(attempt) });
  } catch (err) {
    next(err);
  }
};

const submitExam = async (req, res, next) => {
  try {
    const { attemptId } = req.params;
    const attempt = await ExamAttempt.findById(attemptId).populate('exam');

    if (!attempt || attempt.user.toString() !== req.user._id.toString()) {
      res.status(403);
      throw new Error('Unauthorized');
    }

    if (attempt.status === 'completed') {
      res.status(400);
      throw new Error('Exam already submitted');
    }

    const result = await evaluateAnswers(attempt.exam, attempt.answers);

    const updatedAttempt = await ExamAttempt.findOneAndUpdate(
      {
        _id: attemptId,
        user: req.user._id,
        status: 'in-progress',
      },
      {
        $set: {
          answers: result.evaluated.map((entry) => ({
            questionId: entry.questionId,
            selectedOption: entry.selectedOption,
            isCorrect: entry.isCorrect,
            marksAwarded: entry.marksAwarded,
            timeSpentSeconds: entry.timeSpentSeconds,
            subject: entry.subject,
            topic: entry.topic,
          })),
          score: result.score,
          status: 'completed',
          endTime: new Date(),
        },
      },
      { new: true },
    ).populate('exam');

    if (!updatedAttempt) {
      res.status(400);
      throw new Error('Exam already submitted');
    }

    await AnalyticsJob.findOneAndUpdate(
      { attemptId: updatedAttempt._id },
      {
        $setOnInsert: {
          userId: req.user._id,
          attemptId: updatedAttempt._id,
          attempts: 0,
          maxAttempts: 3,
          status: 'pending',
          availableAt: new Date(),
          error: '',
        },
        $set: {
          updatedAt: new Date(),
        },
      },
      { upsert: true, new: true },
    );

    const passed = result.score >= updatedAttempt.exam.passingMarks;

    res.json({
      attempt: serializeAttemptForClient(updatedAttempt),
      result: {
        score: result.score,
        totalMarks: updatedAttempt.exam.totalMarks,
        percentage: ((result.score / updatedAttempt.exam.totalMarks) * 100).toFixed(2),
        passed,
        evaluated: result.evaluated,
        stats: result.stats
      }
    });
  } catch (err) {
    next(err);
  }
};

const getAttempt = async (req, res, next) => {
  try {
    const { attemptId } = req.params;
    const attempt = await ExamAttempt.findById(attemptId)
      .populate('exam')
      .populate('user', 'name email')
      .populate({
        path: 'answers.questionId',
        select: 'questionText options category difficulty marks subject topic questionImageUrl'
      });

    if (!attempt || (attempt.user._id.toString() !== req.user._id.toString())) {
      res.status(403);
      throw new Error('Unauthorized');
    }

    if (attempt.status === 'completed') {
      const { evaluated } = await evaluateAnswers(attempt.exam, attempt.answers);
      return res.json({ attempt: serializeAttemptForClient(attempt), evaluated });
    }

    res.json({ attempt: serializeAttemptForClient(attempt) });
  } catch (err) {
    next(err);
  }
};

const getAttemptHistory = async (req, res, next) => {
  try {
    const attempts = await ExamAttempt.find({ user: req.user._id, status: 'completed' })
      .populate('exam', 'title subject duration totalMarks passingMarks')
      .sort({ endTime: -1 });

    res.json({ attempts });
  } catch (err) {
    next(err);
  }
};

module.exports = { startExam, saveAnswer, submitExam, getAttempt, getAttemptHistory };
