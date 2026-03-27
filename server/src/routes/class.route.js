const express = require('express');
const {
  assignLabBatch,
  assignStudentsToClass,
  createClass,
  createLabBatch,
  deleteClass,
  deleteLabBatch,
  getClasses,
  removeStudentsFromClass,
  updateClass,
  updateLabBatch,
} = require('../controllers/class.controller');
const { authorizeRoles, verifyToken } = require('../middleware/auth');

const router = express.Router();

router.use(verifyToken, authorizeRoles('admin'));
router.get('/', getClasses);
router.post('/', createClass);
router.put('/:id', updateClass);
router.delete('/:id', deleteClass);
router.post('/:id/assign-students', assignStudentsToClass);
router.post('/:id/remove-students', removeStudentsFromClass);
router.post('/:id/lab-batches', createLabBatch);
router.put('/:id/lab-batches/:labBatchId', updateLabBatch);
router.delete('/:id/lab-batches/:labBatchId', deleteLabBatch);
router.post('/:id/assign-lab-batch', assignLabBatch);

module.exports = router;