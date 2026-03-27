const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const connectDB = require('../src/config/db');
const AnalyticsJob = require('../src/models/analyticsJob.model');
const EmailJob = require('../src/models/emailJob.model');
const PerformanceAnalyticsController = require('../src/controllers/performanceAnalytics.controller');
const { processEmailJob } = require('../src/services/email.service');
const logger = require('../src/utils/logger');

async function connectDb() {
  await connectDB(process.env.MONGO_URI);
}

const nextRetryAt = (attempts) => new Date(Date.now() + (Math.min(attempts, 5) * 60 * 1000));

async function processAnalyticsJob(job) {
  try {
    await PerformanceAnalyticsController.updatePerformanceMetrics(job.userId, job.attemptId);
    await AnalyticsJob.findByIdAndUpdate(job._id, { status: 'done', error: '' });
    logger.info('Processed analytics job', { jobId: job._id.toString(), attemptId: job.attemptId.toString() });
  } catch (err) {
    const nextAttempts = (job.attempts || 0) + 1;
    const exhausted = nextAttempts >= (job.maxAttempts || 3);
    await AnalyticsJob.findByIdAndUpdate(job._id, {
      status: exhausted ? 'failed' : 'pending',
      error: err.message,
      attempts: nextAttempts,
      availableAt: exhausted ? new Date() : nextRetryAt(nextAttempts),
    });
    logger.error('Analytics job failed', { jobId: job._id.toString(), error: err });
  }
}

async function processQueuedEmailJob(job) {
  try {
    await processEmailJob(job);
    await EmailJob.findByIdAndUpdate(job._id, { status: 'done', lastError: '' });
    logger.info('Processed email job', { jobId: job._id.toString(), recipient: job.recipient, type: job.type });
  } catch (err) {
    const nextAttempts = (job.attempts || 0) + 1;
    const exhausted = nextAttempts >= (job.maxAttempts || 3);
    await EmailJob.findByIdAndUpdate(job._id, {
      status: exhausted ? 'failed' : 'pending',
      lastError: err.message,
      attempts: nextAttempts,
      availableAt: exhausted ? new Date() : nextRetryAt(nextAttempts),
    });
    logger.error('Email job failed', { jobId: job._id.toString(), recipient: job.recipient, error: err });
  }
}

async function workerLoop() {
  while (true) {
    try {
      const now = new Date();
      const analyticsJob = await AnalyticsJob.findOneAndUpdate(
        { status: 'pending', availableAt: { $lte: now } },
        { status: 'processing' },
        { sort: { createdAt: 1 }, new: true },
      );

      if (analyticsJob) {
        await processAnalyticsJob(analyticsJob);
        continue;
      }

      const emailJob = await EmailJob.findOneAndUpdate(
        { status: 'pending', availableAt: { $lte: now } },
        { status: 'processing' },
        { sort: { createdAt: 1 }, new: true },
      );

      if (emailJob) {
        await processQueuedEmailJob(emailJob);
        continue;
      }

      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (err) {
      logger.error('Worker error', { error: err });
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
}

async function main() {
  logger.info('Starting background job worker');
  await connectDb();
  await workerLoop();
}

main().catch(err => { logger.error('Worker fatal', { error: err }); process.exit(1); });
