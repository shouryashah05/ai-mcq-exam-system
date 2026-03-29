const express = require('express');
const { createQuestion, getQuestions, getQuestionById, updateQuestion, deleteQuestion, bulkCreateQuestions } = require('../controllers/question.controller');
const { uploadQuestionImage, deleteQuestionImage } = require('../controllers/upload.controller');
const { verifyToken, optionalVerifyToken, authorizeRoles } = require('../middleware/auth');
const { questionImageUpload } = require('../middleware/upload');
const { createQuestionValidation, updateQuestionValidation, bulkCreateQuestionsValidation } = require('../middleware/validators/question.validator');

const router = express.Router();

router.use(verifyToken, authorizeRoles('admin', 'teacher'));
router.get('/', getQuestions);
router.get('/:id', getQuestionById);
router.post('/upload-image', questionImageUpload.single('image'), uploadQuestionImage);
router.post('/delete-image', deleteQuestionImage);
router.post('/', createQuestionValidation, createQuestion);
router.post('/bulk', bulkCreateQuestionsValidation, bulkCreateQuestions);
router.put('/:id', updateQuestionValidation, updateQuestion);
router.delete('/:id', deleteQuestion);

module.exports = router;
