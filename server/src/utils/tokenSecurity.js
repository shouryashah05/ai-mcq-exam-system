const crypto = require('crypto');

const buildEncryptionKey = () => crypto
  .createHash('sha256')
  .update(process.env.TOKEN_ENCRYPTION_SECRET || process.env.JWT_SECRET || 'local-token-encryption-fallback')
  .digest();

const generateRawToken = () => crypto.randomBytes(32).toString('hex');

const hashToken = (token) => {
  if (!token) {
    return '';
  }

  return crypto.createHash('sha256').update(String(token)).digest('hex');
};

const createTokenRecord = () => {
  const rawToken = generateRawToken();
  return {
    rawToken,
    hashedToken: hashToken(rawToken),
  };
};

const encryptToken = (token) => {
  if (!token) {
    return '';
  }

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', buildEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(String(token), 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return `${iv.toString('base64url')}.${authTag.toString('base64url')}.${encrypted.toString('base64url')}`;
};

const decryptToken = (payload) => {
  if (!payload) {
    return '';
  }

  const parts = String(payload).split('.');
  if (parts.length !== 3) {
    return String(payload);
  }

  try {
    const [ivPart, authTagPart, encryptedPart] = parts;
    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      buildEncryptionKey(),
      Buffer.from(ivPart, 'base64url')
    );
    decipher.setAuthTag(Buffer.from(authTagPart, 'base64url'));
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(encryptedPart, 'base64url')),
      decipher.final(),
    ]);

    return decrypted.toString('utf8');
  } catch (error) {
    return String(payload);
  }
};

const buildHashedTokenLookup = (fieldName, rawToken) => {
  const hashedToken = hashToken(rawToken);
  return {
    $or: [
      { [fieldName]: hashedToken },
      { [fieldName]: rawToken },
    ],
  };
};

module.exports = {
  buildHashedTokenLookup,
  createTokenRecord,
  decryptToken,
  encryptToken,
  generateRawToken,
  hashToken,
};