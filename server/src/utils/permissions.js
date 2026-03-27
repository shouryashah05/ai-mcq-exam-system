const MANAGEABLE_ROLES = ['admin', 'teacher'];

const isAdmin = (user) => user?.role === 'admin';
const isTeacher = (user) => user?.role === 'teacher';
const canManageContent = (user) => MANAGEABLE_ROLES.includes(user?.role);

const ensureResourceOwnerOrAdmin = (user, resource, ownerField = 'createdBy') => {
  if (isAdmin(user)) {
    return;
  }

  const owner = resource?.[ownerField];
  const ownerId = typeof owner === 'object' && owner !== null ? owner._id || owner.id : owner;
  if (!ownerId || String(ownerId) !== String(user?._id || user?.id || '')) {
    const error = new Error('Forbidden');
    error.statusCode = 403;
    throw error;
  }
};

const getManagedSubjects = (user) => Array.isArray(user?.subjects)
  ? user.subjects.filter(Boolean)
  : [];

const getManagedClasses = (user) => Array.isArray(user?.assignedBatches)
  ? user.assignedBatches.filter(Boolean)
  : [];

const getManagedBatches = (user) => getManagedClasses(user);

const getManagedLabBatchAssignments = (user) => Array.isArray(user?.assignedLabBatches)
  ? user.assignedLabBatches
    .map((entry) => ({
      className: String(entry?.className || '').trim(),
      labBatchName: String(entry?.labBatchName || '').trim(),
    }))
    .filter((entry) => entry.className && entry.labBatchName)
  : [];

const getManagedStudentFilter = (user) => {
  if (!isTeacher(user)) {
    return { role: 'student' };
  }

  const managedClasses = getManagedClasses(user);
  const managedLabBatchAssignments = getManagedLabBatchAssignments(user);

  if (managedClasses.length === 0 && managedLabBatchAssignments.length === 0) {
    return null;
  }

  const scopeFilters = [];
  if (managedClasses.length > 0) {
    scopeFilters.push({ batch: { $in: managedClasses } });
  }

  managedLabBatchAssignments.forEach((entry) => {
    scopeFilters.push({ batch: entry.className, labBatch: entry.labBatchName });
  });

  if (scopeFilters.length === 1) {
    return { role: 'student', ...scopeFilters[0] };
  }

  return { role: 'student', $or: scopeFilters };
};

const ensureTeacherSubjectAccess = (user, subject) => {
  if (isAdmin(user)) {
    return;
  }

  if (!isTeacher(user)) {
    const error = new Error('Forbidden');
    error.statusCode = 403;
    throw error;
  }

  const managedSubjects = getManagedSubjects(user);
  if (!subject || !managedSubjects.includes(subject)) {
    const error = new Error('Forbidden');
    error.statusCode = 403;
    throw error;
  }
};

module.exports = {
  canManageContent,
  ensureResourceOwnerOrAdmin,
  ensureTeacherSubjectAccess,
  getManagedBatches,
  getManagedClasses,
  getManagedLabBatchAssignments,
  getManagedStudentFilter,
  getManagedSubjects,
  isAdmin,
  isTeacher,
};