const normalizeWhitespace = (value) => {
  if (typeof value !== 'string') return '';
  return value.trim().replace(/\s+/g, ' ');
};

const buildEnrollmentNo = () => {
  const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `AUTO${Date.now().toString(36).toUpperCase().slice(-5)}${rand}`.toUpperCase();
};

const buildAdminId = () => {
  const rand = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `ADM-${Date.now().toString(36).toUpperCase().slice(-4)}${rand}`;
};

const buildEmployeeId = () => {
  const rand = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `EMP-${Date.now().toString(36).toUpperCase().slice(-4)}${rand}`;
};

const normalizeRoleIdentifier = (value) => {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim().toUpperCase();
};

const splitName = (fullName = '') => {
  const normalizedName = normalizeWhitespace(fullName);
  if (!normalizedName) {
    return { firstName: '', lastName: '' };
  }

  const [firstName, ...rest] = normalizedName.split(' ');
  return {
    firstName: firstName || '',
    lastName: rest.join(' '),
  };
};

const buildFullName = (firstName = '', lastName = '') => {
  const normalizedFirstName = normalizeWhitespace(firstName);
  const normalizedLastName = normalizeWhitespace(lastName);
  return [normalizedFirstName, normalizedLastName].filter(Boolean).join(' ');
};

const normalizeUserIdentity = ({ name, firstName, lastName }) => {
  const normalizedName = normalizeWhitespace(name);
  const normalizedFirstName = normalizeWhitespace(firstName);
  const normalizedLastName = normalizeWhitespace(lastName);

  if (normalizedFirstName || normalizedLastName) {
    const derived = splitName(normalizedName);
    const resolvedFirstName = normalizedFirstName || derived.firstName;
    const resolvedLastName = normalizedLastName || derived.lastName;
    return {
      firstName: resolvedFirstName,
      lastName: resolvedLastName,
      name: buildFullName(resolvedFirstName, resolvedLastName) || normalizedName,
    };
  }

  const derived = splitName(normalizedName);
  return {
    firstName: derived.firstName,
    lastName: derived.lastName,
    name: normalizedName || buildFullName(derived.firstName, derived.lastName),
  };
};

const serializeUser = (user) => {
  if (!user) return null;

  const source = typeof user.toObject === 'function' ? user.toObject() : user;
  const identity = normalizeUserIdentity(source);
  const assignedLabBatches = Array.isArray(source.assignedLabBatches)
    ? source.assignedLabBatches
      .map((entry) => ({
        className: normalizeWhitespace(entry?.className),
        labBatchName: normalizeWhitespace(entry?.labBatchName),
      }))
      .filter((entry) => entry.className && entry.labBatchName)
    : [];

  return {
    _id: source._id,
    name: identity.name,
    firstName: identity.firstName,
    lastName: identity.lastName,
    email: source.email,
    role: source.role,
    adminId: source.adminId || '',
    employeeId: source.employeeId,
    department: source.department,
    subjects: Array.isArray(source.subjects) ? source.subjects : [],
    batch: source.batch || '',
    class: source.batch || '',
    labBatch: source.labBatch || '',
    assignedBatches: Array.isArray(source.assignedBatches) ? source.assignedBatches : [],
    assignedClasses: Array.isArray(source.assignedBatches) ? source.assignedBatches : [],
    assignedLabBatches,
    enrollmentNo: source.enrollmentNo,
    isVerified: source.isVerified,
    isActive: source.isActive,
    createdAt: source.createdAt,
  };
};

module.exports = {
  buildAdminId,
  buildEmployeeId,
  buildEnrollmentNo,
  buildFullName,
  normalizeUserIdentity,
  normalizeRoleIdentifier,
  serializeUser,
  splitName,
};