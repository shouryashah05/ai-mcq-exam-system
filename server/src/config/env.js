const DEFAULT_ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:4173',
  'http://127.0.0.1:4173',
];
const DEFAULT_DEV_JWT_SECRET = 'local_dev_jwt_secret_at_least_32_chars_long';
const DEFAULT_DEV_MONGO_URI = 'mongodb://127.0.0.1:27017/ai_mcq_exam_system';

const normalizeBoolean = (value, defaultValue = false) => {
  if (value === undefined || value === null || value === '') {
    return defaultValue;
  }

  return String(value).toLowerCase() === 'true';
};

const getNodeEnv = () => process.env.NODE_ENV || 'development';

const isTestEnv = () => getNodeEnv() === 'test';
const isProductionEnv = () => getNodeEnv() === 'production';
const isDevelopmentEnv = () => getNodeEnv() === 'development';

const parseCsv = (value, fallback = []) => {
  if (!value) {
    return fallback;
  }

  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
};

const getAllowedOrigins = () => parseCsv(process.env.ALLOWED_ORIGINS, DEFAULT_ALLOWED_ORIGINS);

const isLoopbackOrigin = (origin) => {
  try {
    const parsed = new URL(origin);
    return ['localhost', '127.0.0.1'].includes(parsed.hostname);
  } catch (error) {
    return false;
  }
};

const isOriginAllowed = (origin) => {
  if (!origin) {
    return true;
  }

  const allowedOrigins = new Set(getAllowedOrigins());
  if (allowedOrigins.has(origin)) {
    return true;
  }

  return isDevelopmentEnv() && isLoopbackOrigin(origin);
};

const applyDevelopmentDefaults = () => {
  if (!isDevelopmentEnv()) {
    return;
  }

  if (!process.env.JWT_SECRET) {
    process.env.JWT_SECRET = DEFAULT_DEV_JWT_SECRET;
  }

  if (!process.env.MONGO_URI) {
    process.env.MONGO_URI = DEFAULT_DEV_MONGO_URI;
  }
};

const getCookieOptions = () => {
  const secure = normalizeBoolean(process.env.COOKIE_SECURE, isProductionEnv());
  const sameSite = process.env.COOKIE_SAME_SITE || (secure ? 'none' : 'lax');

  return {
    httpOnly: true,
    secure,
    sameSite,
    maxAge: parseInt(process.env.AUTH_COOKIE_MAX_AGE_MS || String(30 * 24 * 60 * 60 * 1000), 10),
    path: '/',
  };
};

const validateServerEnv = () => {
  applyDevelopmentDefaults();
  const errors = [];

  if (!process.env.JWT_SECRET) {
    errors.push('JWT_SECRET is required');
  } else if (isProductionEnv() && process.env.JWT_SECRET.length < 32) {
    errors.push('JWT_SECRET must be at least 32 characters long');
  }

  if (!isTestEnv() && !process.env.MONGO_URI) {
    errors.push('MONGO_URI is required outside the test environment');
  }

  if (errors.length > 0) {
    const error = new Error(`Invalid server configuration: ${errors.join('; ')}`);
    error.statusCode = 500;
    throw error;
  }
};

module.exports = {
  getAllowedOrigins,
  isOriginAllowed,
  isDevelopmentEnv,
  getCookieOptions,
  getNodeEnv,
  isProductionEnv,
  isTestEnv,
  normalizeBoolean,
  validateServerEnv,
};