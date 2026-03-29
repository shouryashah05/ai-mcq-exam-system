const express = require('express');
const { createExam, getExams, getExamById, updateExam, deleteExam } = require('../controllers/exam.controller');
const { verifyToken, optionalVerifyToken, authorizeRoles } = require('../middleware/auth');
const { createExamValidation, updateExamValidation } = require('../middleware/validators/exam.validator');

const router = express.Router();

router.get('/', verifyToken, getExams);
router.get('/:id', verifyToken, getExamById);

// Content managers: create, update, delete
router.use(verifyToken, authorizeRoles('admin', 'teacher'));
router.post('/', createExamValidation, createExam);
router.put('/:id', updateExamValidation, updateExam);
router.delete('/:id', deleteExam);

module.exports = router;
