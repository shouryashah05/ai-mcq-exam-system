const normalizeWhitespace = (value) => {
  if (typeof value !== 'string') return '';
  return value.trim().replace(/\s+/g, ' ');
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

  return {
    _id: source._id,
    name: identity.name,
    firstName: identity.firstName,
    lastName: identity.lastName,
    email: source.email,
    role: source.role,
    enrollmentNo: source.enrollmentNo,
    isVerified: source.isVerified,
    isActive: source.isActive,
    createdAt: source.createdAt,
  };
};

module.exports = {
  buildFullName,
  normalizeUserIdentity,
  serializeUser,
  splitName,
};