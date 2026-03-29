const express = require('express');
const { startExam, saveAnswer, submitExam, cancelAttempt, getActiveAttemptsForExam, resetAttempt, getAttempt, getAttemptHistory } = require('../controllers/examAttempt.controller');
const { verifyToken, authorizeRoles } = require('../middleware/auth');
const { startExamValidation, saveAnswerValidation } = require('../middleware/validators/exam.validator');

const router = express.Router();

router.use(verifyToken);
router.post('/start', startExamValidation, startExam);
router.put('/:attemptId/answer', saveAnswerValidation, saveAnswer);
router.post('/:attemptId/submit', submitExam);
router.post('/:attemptId/cancel', cancelAttempt);
router.get('/exam/:examId/active', authorizeRoles('admin', 'teacher'), getActiveAttemptsForExam);
router.post('/:attemptId/reset', authorizeRoles('admin', 'teacher'), resetAttempt);
router.get('/history/list', getAttemptHistory);
router.get('/:attemptId', getAttempt);

module.exports = router;
