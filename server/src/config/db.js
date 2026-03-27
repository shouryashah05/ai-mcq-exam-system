const mongoose = require('mongoose');
const logger = require('../utils/logger');
let MongoMemoryServer;
try {
  MongoMemoryServer = require('mongodb-memory-server').MongoMemoryServer;
} catch (e) {
  MongoMemoryServer = null;
}

const connectDB = async (mongoUri) => {
  let uri = mongoUri;
  try {
    if (!uri && process.env.NODE_ENV === 'test' && MongoMemoryServer) {
      const memoryServer = await MongoMemoryServer.create();
      uri = memoryServer.getUri();
      logger.info('Started in-memory MongoDB for tests');
    }

    if (!uri) {
      throw new Error('MONGO_URI is required to connect to MongoDB');
    }

    const conn = await mongoose.connect(uri, {
      maxPoolSize: parseInt(process.env.MONGO_MAX_POOL_SIZE || '10', 10),
      minPoolSize: parseInt(process.env.MONGO_MIN_POOL_SIZE || '2', 10),
      maxIdleTimeMS: parseInt(process.env.MONGO_MAX_IDLE_TIME_MS || '45000', 10),
    });
    logger.info('MongoDB connected', { host: conn.connection.host || uri });
  } catch (err) {
    logger.error('MongoDB connection error', { error: err });
    process.exit(1);
  }
};

module.exports = connectDB;
module.exports.connect = connectDB;
