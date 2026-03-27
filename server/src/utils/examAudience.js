const { getManagedClasses, getManagedLabBatchAssignments, isTeacher } = require('./permissions');

const normalizeStringList = (values) => Array.from(new Set(
  (Array.isArray(values) ? values : [])
    .map((value) => String(value || '').trim())
    .filter(Boolean)
));

const normalizeLabBatchAssignments = (values) => Array.from(new Map(
  (Array.isArray(values) ? values : [])
    .map((value) => {
      if (typeof value === 'string') {
        const [className, labBatchName] = value.split('::').map((item) => String(item || '').trim());
        return { className, labBatchName };
      }

      return {
        className: String(value?.className || value?.class || '').trim(),
        labBatchName: String(value?.labBatchName || value?.labBatch || '').trim(),
      };
    })
    .filter((value) => value.className && value.labBatchName)
    .map((value) => [`${value.className}::${value.labBatchName}`, value])
).values());

const normalizeExamAudience = (source = {}) => ({
  assignedClasses: normalizeStringList(source.assignedClasses ?? source.assignedBatches),
  assignedLabBatches: normalizeLabBatchAssignments(source.assignedLabBatches),
});

const hasExamAudience = (audience = {}) => {
  const normalized = normalizeExamAudience(audience);
  return normalized.assignedClasses.length > 0 || normalized.assignedLabBatches.length > 0;
};

const validateTeacherExamAudience = (user, audience = {}) => {
  const normalized = normalizeExamAudience(audience);

  if (!isTeacher(user)) {
    return normalized;
  }

  const managedClasses = getManagedClasses(user);
  const managedLabBatches = getManagedLabBatchAssignments(user);

  if (!normalized.assignedClasses.length && !normalized.assignedLabBatches.length) {
    const error = new Error('Teachers must select at least one class or lab batch for the exam audience');
    error.statusCode = 400;
    throw error;
  }

  const invalidClasses = normalized.assignedClasses.filter((className) => !managedClasses.includes(className));
  if (invalidClasses.length > 0) {
    const error = new Error(`Teachers can only assign exams to their own classes. Invalid classes: ${invalidClasses.join(', ')}`);
    error.statusCode = 400;
    throw error;
  }

  const invalidLabBatches = normalized.assignedLabBatches.filter((assignment) => !managedLabBatches.some((managedAssignment) => (
    managedAssignment.className === assignment.className && managedAssignment.labBatchName === assignment.labBatchName
  )));
  if (invalidLabBatches.length > 0) {
    const error = new Error(`Teachers can only assign exams to their own lab batches. Invalid lab batches: ${invalidLabBatches.map((assignment) => `${assignment.className} / ${assignment.labBatchName}`).join(', ')}`);
    error.statusCode = 400;
    throw error;
  }

  return normalized;
};

const isExamVisibleToStudent = (exam, student) => {
  const creatorRole = exam?.createdBy?.role;
  if (exam?.examType === 'adaptive') {
    return false;
  }

  if (creatorRole === 'admin') {
    return true;
  }

  if (creatorRole !== 'teacher') {
    return false;
  }

  const audience = normalizeExamAudience(exam);
  if (!hasExamAudience(audience)) {
    return false;
  }

  const studentClass = String(student?.batch || student?.class || '').trim();
  const studentLabBatch = String(student?.labBatch || '').trim();

  if (audience.assignedClasses.includes(studentClass)) {
    return true;
  }

  return audience.assignedLabBatches.some((assignment) => (
    assignment.className === studentClass && assignment.labBatchName === studentLabBatch
  ));
};

module.exports = {
  hasExamAudience,
  isExamVisibleToStudent,
  normalizeExamAudience,
  normalizeLabBatchAssignments,
  normalizeStringList,
  validateTeacherExamAudience,
};