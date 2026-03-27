const serializeMeta = (meta) => {
  if (!meta || typeof meta !== 'object') {
    return undefined;
  }

  return Object.entries(meta).reduce((accumulator, [key, value]) => {
    if (value instanceof Error) {
      accumulator[key] = {
        message: value.message,
        stack: value.stack,
      };
      return accumulator;
    }

    accumulator[key] = value;
    return accumulator;
  }, {});
};

const writeLog = (level, message, meta) => {
  const entry = {
    level,
    message,
    timestamp: new Date().toISOString(),
  };

  const serializedMeta = serializeMeta(meta);
  if (serializedMeta) {
    entry.meta = serializedMeta;
  }

  const line = JSON.stringify(entry);
  if (level === 'error') {
    console.error(line);
    return;
  }

  if (level === 'warn') {
    console.warn(line);
    return;
  }

  console.log(line);
};

module.exports = {
  info: (message, meta) => writeLog('info', message, meta),
  warn: (message, meta) => writeLog('warn', message, meta),
  error: (message, meta) => writeLog('error', message, meta),
};