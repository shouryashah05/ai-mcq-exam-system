const path = require('path');
require("dotenv").config({ path: path.resolve(__dirname, '../.env') });
const app = require("./app");
const connectDB = require("./config/db");
const { validateServerEnv } = require('./config/env');
const logger = require('./utils/logger');

validateServerEnv();

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;

// Connect to MongoDB, then start server
connectDB(MONGO_URI).then(() => {
  app.listen(PORT, () => {
    logger.info('Server running', { port: PORT });
  });
}); 
