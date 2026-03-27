const AcademicClass = require('../models/academicClass.model');
const User = require('../models/user.model');
const { serializeUser } = require('../utils/userIdentity');

const normalizeName = (value) => String(value || '').trim();
const normalizeStudentIds = (studentIds) => Array.from(new Set(
  (Array.isArray(studentIds) ? studentIds : [])
    .map((studentId) => String(studentId || '').trim())
    .filter(Boolean)
));

const normalizeCapacity = (value) => Number(value || 0);

const getSerializedStudents = async () => {
  const students = await User.find({ role: 'student' }).select('-password').sort({ firstName: 1, lastName: 1, name: 1 });
  return students.map(serializeUser);
};

const propagateClassRenameToTeachers = async (oldName, newName) => {
  if (!oldName || !newName || oldName === newName) {
    return;
  }

  await Promise.all([
    User.updateMany(
      { role: 'teacher', assignedBatches: oldName },
      { $set: { 'assignedBatches.$[entry]': newName } },
      { arrayFilters: [{ entry: oldName }] }
    ),
    User.updateMany(
      { role: 'teacher', 'assignedLabBatches.className': oldName },
      { $set: { 'assignedLabBatches.$[entry].className': newName } },
      { arrayFilters: [{ 'entry.className': oldName }] }
    ),
  ]);
};

const serializeClass = (academicClass, students = []) => {
  const source = typeof academicClass.toObject === 'function' ? academicClass.toObject() : academicClass;
  const classStudents = students.filter((student) => student.batch === source.name);

  return {
    _id: source._id,
    name: source.name,
    capacity: source.capacity,
    description: source.description || '',
    createdAt: source.createdAt,
    studentCount: classStudents.length,
    labBatches: (Array.isArray(source.labBatches) ? source.labBatches : []).map((labBatch) => ({
      _id: labBatch._id,
      name: labBatch.name,
      capacity: labBatch.capacity,
      studentCount: classStudents.filter((student) => student.labBatch === labBatch.name).length,
    })),
  };
};

const getClasses = async (req, res, next) => {
  try {
    const [classes, students] = await Promise.all([
      AcademicClass.find().sort({ name: 1 }),
      User.find({ role: 'student' }).select('-password').sort({ firstName: 1, lastName: 1, name: 1 }),
    ]);

    const serializedStudents = students.map(serializeUser);
    res.json({
      classes: classes.map((academicClass) => serializeClass(academicClass, serializedStudents)),
      students: serializedStudents,
    });
  } catch (err) {
    next(err);
  }
};

const createClass = async (req, res, next) => {
  try {
    const name = normalizeName(req.body.name).toUpperCase();
    const capacity = normalizeCapacity(req.body.capacity);
    const description = normalizeName(req.body.description);

    if (!name) {
      res.status(400);
      throw new Error('Class name is required');
    }

    if (!Number.isInteger(capacity) || capacity <= 0) {
      res.status(400);
      throw new Error('Class capacity must be a positive integer');
    }

    const existingClass = await AcademicClass.findOne({ name });
    if (existingClass) {
      res.status(409);
      throw new Error('A class with this name already exists');
    }

    const academicClass = await AcademicClass.create({ name, capacity, description, labBatches: [] });
    res.status(201).json({ class: serializeClass(academicClass), message: 'Class created successfully.' });
  } catch (err) {
    next(err);
  }
};

const updateClass = async (req, res, next) => {
  try {
    const { id } = req.params;
    const academicClass = await AcademicClass.findById(id);
    if (!academicClass) {
      res.status(404);
      throw new Error('Class not found');
    }

    const nextName = normalizeName(req.body.name || academicClass.name).toUpperCase();
    const nextCapacity = normalizeCapacity(req.body.capacity ?? academicClass.capacity);
    const nextDescription = normalizeName(req.body.description ?? academicClass.description);

    if (!nextName) {
      res.status(400);
      throw new Error('Class name is required');
    }

    if (!Number.isInteger(nextCapacity) || nextCapacity <= 0) {
      res.status(400);
      throw new Error('Class capacity must be a positive integer');
    }

    const duplicateClass = await AcademicClass.findOne({ name: nextName, _id: { $ne: academicClass._id } });
    if (duplicateClass) {
      res.status(409);
      throw new Error('A class with this name already exists');
    }

    const currentStudentCount = await User.countDocuments({ role: 'student', batch: academicClass.name });
    if (nextCapacity > 0 && currentStudentCount > nextCapacity) {
      res.status(400);
      throw new Error(`Class capacity cannot be lower than the current student count of ${currentStudentCount}`);
    }

    const previousName = academicClass.name;
    academicClass.name = nextName;
    academicClass.capacity = nextCapacity;
    academicClass.description = nextDescription;
    await academicClass.save();

    if (previousName !== nextName) {
      await Promise.all([
        User.updateMany({ role: 'student', batch: previousName }, { $set: { batch: nextName } }),
        propagateClassRenameToTeachers(previousName, nextName),
      ]);
    }

    const serializedStudents = await getSerializedStudents();
    res.json({
      class: serializeClass(academicClass, serializedStudents),
      students: serializedStudents,
      message: 'Class updated successfully.',
    });
  } catch (err) {
    next(err);
  }
};

const deleteClass = async (req, res, next) => {
  try {
    const { id } = req.params;
    const academicClass = await AcademicClass.findById(id);
    if (!academicClass) {
      res.status(404);
      throw new Error('Class not found');
    }

    const className = academicClass.name;

    await Promise.all([
      User.updateMany({ role: 'student', batch: className }, { $set: { batch: '', labBatch: '' } }),
      User.updateMany({ role: 'teacher' }, { $pull: { assignedBatches: className, assignedLabBatches: { className } } }),
      AcademicClass.findByIdAndDelete(id),
    ]);

    res.json({ message: 'Class deleted successfully.' });
  } catch (err) {
    next(err);
  }
};

const assignStudentsToClass = async (req, res, next) => {
  try {
    const { id } = req.params;
    const studentIds = normalizeStudentIds(req.body.studentIds);

    if (studentIds.length === 0) {
      res.status(400);
      throw new Error('Select at least one student to assign to the class');
    }

    const academicClass = await AcademicClass.findById(id);
    if (!academicClass) {
      res.status(404);
      throw new Error('Class not found');
    }

    const students = await User.find({ _id: { $in: studentIds }, role: 'student' });
    if (students.length !== studentIds.length) {
      res.status(400);
      throw new Error('One or more selected students do not exist');
    }

    const currentClassStudentCount = await User.countDocuments({ role: 'student', batch: academicClass.name });
    const alreadyInClassCount = students.filter((student) => student.batch === academicClass.name).length;
    const finalClassCount = currentClassStudentCount + (students.length - alreadyInClassCount);

    if (academicClass.capacity > 0 && finalClassCount > academicClass.capacity) {
      res.status(400);
      throw new Error(`This assignment exceeds the class capacity of ${academicClass.capacity}`);
    }

    await User.updateMany(
      { _id: { $in: studentIds }, role: 'student' },
      { $set: { batch: academicClass.name, labBatch: '' } },
    );

    const refreshedStudents = await User.find({ role: 'student' }).select('-password').sort({ firstName: 1, lastName: 1, name: 1 });
    res.json({
      class: serializeClass(academicClass, refreshedStudents.map(serializeUser)),
      students: refreshedStudents.map(serializeUser),
      message: 'Students assigned to class successfully.',
    });
  } catch (err) {
    next(err);
  }
};

const removeStudentsFromClass = async (req, res, next) => {
  try {
    const { id } = req.params;
    const studentIds = normalizeStudentIds(req.body.studentIds);

    if (studentIds.length === 0) {
      res.status(400);
      throw new Error('Select at least one student to remove from the class');
    }

    const academicClass = await AcademicClass.findById(id);
    if (!academicClass) {
      res.status(404);
      throw new Error('Class not found');
    }

    const students = await User.find({ _id: { $in: studentIds }, role: 'student' });
    if (students.length !== studentIds.length) {
      res.status(400);
      throw new Error('One or more selected students do not exist');
    }

    const invalidStudent = students.find((student) => student.batch !== academicClass.name);
    if (invalidStudent) {
      res.status(400);
      throw new Error('Students must belong to the selected class before they can be removed');
    }

    await User.updateMany(
      { _id: { $in: studentIds }, role: 'student', batch: academicClass.name },
      { $set: { batch: '', labBatch: '' } },
    );

    const serializedStudents = await getSerializedStudents();
    res.json({
      class: serializeClass(academicClass, serializedStudents),
      students: serializedStudents,
      message: 'Students removed from class successfully.',
    });
  } catch (err) {
    next(err);
  }
};

const createLabBatch = async (req, res, next) => {
  try {
    const { id } = req.params;
    const name = normalizeName(req.body.name);
    const capacity = normalizeCapacity(req.body.capacity);

    if (!name) {
      res.status(400);
      throw new Error('Lab batch name is required');
    }

    if (!Number.isInteger(capacity) || capacity <= 0) {
      res.status(400);
      throw new Error('Lab batch capacity must be a positive integer');
    }

    const academicClass = await AcademicClass.findById(id);
    if (!academicClass) {
      res.status(404);
      throw new Error('Class not found');
    }

    if (academicClass.labBatches.some((labBatch) => labBatch.name.toLowerCase() === name.toLowerCase())) {
      res.status(409);
      throw new Error('A lab batch with this name already exists in the class');
    }

    academicClass.labBatches.push({ name, capacity });
    await academicClass.save();

    const students = await User.find({ role: 'student' }).select('-password').sort({ firstName: 1, lastName: 1, name: 1 });
    res.status(201).json({
      class: serializeClass(academicClass, students.map(serializeUser)),
      students: students.map(serializeUser),
      message: 'Lab batch created successfully.',
    });
  } catch (err) {
    next(err);
  }
};

const updateLabBatch = async (req, res, next) => {
  try {
    const { id, labBatchId } = req.params;
    const academicClass = await AcademicClass.findById(id);
    if (!academicClass) {
      res.status(404);
      throw new Error('Class not found');
    }

    const labBatch = academicClass.labBatches.id(labBatchId);
    if (!labBatch) {
      res.status(404);
      throw new Error('Lab batch not found');
    }

    const nextName = normalizeName(req.body.name || labBatch.name);
    const nextCapacity = normalizeCapacity(req.body.capacity ?? labBatch.capacity);

    if (!nextName) {
      res.status(400);
      throw new Error('Lab batch name is required');
    }

    if (!Number.isInteger(nextCapacity) || nextCapacity <= 0) {
      res.status(400);
      throw new Error('Lab batch capacity must be a positive integer');
    }

    const duplicateBatch = academicClass.labBatches.find((entry) => (
      String(entry._id) !== String(labBatchId) && entry.name.toLowerCase() === nextName.toLowerCase()
    ));
    if (duplicateBatch) {
      res.status(409);
      throw new Error('A lab batch with this name already exists in the class');
    }

    const currentStudentCount = await User.countDocuments({ role: 'student', batch: academicClass.name, labBatch: labBatch.name });
    if (nextCapacity > 0 && currentStudentCount > nextCapacity) {
      res.status(400);
      throw new Error(`Lab batch capacity cannot be lower than the current student count of ${currentStudentCount}`);
    }

    const previousName = labBatch.name;
    labBatch.name = nextName;
    labBatch.capacity = nextCapacity;
    await academicClass.save();

    if (previousName !== nextName) {
      await Promise.all([
        User.updateMany(
          { role: 'student', batch: academicClass.name, labBatch: previousName },
          { $set: { labBatch: nextName } },
        ),
        User.updateMany(
          { role: 'teacher', assignedLabBatches: { $elemMatch: { className: academicClass.name, labBatchName: previousName } } },
          { $set: { 'assignedLabBatches.$[entry].labBatchName': nextName } },
          { arrayFilters: [{ 'entry.className': academicClass.name, 'entry.labBatchName': previousName }] }
        ),
      ]);
    }

    const serializedStudents = await getSerializedStudents();
    res.json({
      class: serializeClass(academicClass, serializedStudents),
      students: serializedStudents,
      message: 'Lab batch updated successfully.',
    });
  } catch (err) {
    next(err);
  }
};

const deleteLabBatch = async (req, res, next) => {
  try {
    const { id, labBatchId } = req.params;
    const academicClass = await AcademicClass.findById(id);
    if (!academicClass) {
      res.status(404);
      throw new Error('Class not found');
    }

    const labBatch = academicClass.labBatches.id(labBatchId);
    if (!labBatch) {
      res.status(404);
      throw new Error('Lab batch not found');
    }

    const labBatchName = labBatch.name;
    labBatch.deleteOne();
    await Promise.all([
      academicClass.save(),
      User.updateMany(
        { role: 'student', batch: academicClass.name, labBatch: labBatchName },
        { $set: { labBatch: '' } },
      ),
      User.updateMany(
        { role: 'teacher' },
        { $pull: { assignedLabBatches: { className: academicClass.name, labBatchName } } }
      ),
    ]);

    const serializedStudents = await getSerializedStudents();
    res.json({
      class: serializeClass(academicClass, serializedStudents),
      students: serializedStudents,
      message: 'Lab batch deleted successfully.',
    });
  } catch (err) {
    next(err);
  }
};

const assignLabBatch = async (req, res, next) => {
  try {
    const { id } = req.params;
    const studentIds = normalizeStudentIds(req.body.studentIds);
    const labBatchName = normalizeName(req.body.labBatchName);

    if (studentIds.length === 0) {
      res.status(400);
      throw new Error('Select at least one student to update lab batch assignments');
    }

    const academicClass = await AcademicClass.findById(id);
    if (!academicClass) {
      res.status(404);
      throw new Error('Class not found');
    }

    const students = await User.find({ _id: { $in: studentIds }, role: 'student' });
    if (students.length !== studentIds.length) {
      res.status(400);
      throw new Error('One or more selected students do not exist');
    }

    const invalidStudent = students.find((student) => student.batch !== academicClass.name);
    if (invalidStudent) {
      res.status(400);
      throw new Error('Students must belong to the selected class before assigning a lab batch');
    }

    if (!labBatchName) {
      await User.updateMany({ _id: { $in: studentIds }, role: 'student' }, { $set: { labBatch: '' } });
      const refreshedStudents = await User.find({ role: 'student' }).select('-password').sort({ firstName: 1, lastName: 1, name: 1 });
      return res.json({
        class: serializeClass(academicClass, refreshedStudents.map(serializeUser)),
        students: refreshedStudents.map(serializeUser),
        message: 'Selected students were removed from their lab batch.',
      });
    }

    const labBatch = academicClass.labBatches.find((entry) => entry.name === labBatchName);
    if (!labBatch) {
      res.status(404);
      throw new Error('Lab batch not found in this class');
    }

    const currentLabBatchMembers = await User.find({ role: 'student', batch: academicClass.name, labBatch: labBatch.name }).select('_id');
    const alreadyInLabBatchCount = students.filter((student) => student.labBatch === labBatch.name).length;
    const finalLabBatchCount = currentLabBatchMembers.length + (students.length - alreadyInLabBatchCount);

    if (labBatch.capacity > 0 && finalLabBatchCount > labBatch.capacity) {
      res.status(400);
      throw new Error(`This assignment exceeds the lab batch capacity of ${labBatch.capacity}`);
    }

    await User.updateMany({ _id: { $in: studentIds }, role: 'student' }, { $set: { labBatch: labBatch.name } });
    const refreshedStudents = await User.find({ role: 'student' }).select('-password').sort({ firstName: 1, lastName: 1, name: 1 });

    res.json({
      class: serializeClass(academicClass, refreshedStudents.map(serializeUser)),
      students: refreshedStudents.map(serializeUser),
      message: 'Lab batch assignments updated successfully.',
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
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
};