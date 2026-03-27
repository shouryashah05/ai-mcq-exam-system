const PerformanceAnalytics = require('../models/performanceAnalytics.model');

const buildStrengthLevelExpression = () => ({
  $switch: {
    branches: [
      {
        case: {
          $and: [
            { $gte: ['$accuracy', 80] },
            { $gte: ['$totalAttempts', 3] },
          ],
        },
        then: 'Strong',
      },
      {
        case: { $gte: ['$accuracy', 50] },
        then: 'Average',
      },
    ],
    default: 'Weak',
  },
});

const buildAnalyticsUpdatePipeline = ({ userId, subject, topic, totalAttempts, correctAttempts, wrongAttempts, unattemptedCount, totalTimeSeconds, lastDifficultyLevel }) => ([
  {
    $set: {
      userId,
      subject,
      topic,
      lastDifficultyLevel: lastDifficultyLevel || 'Medium',
      _previousTotalAttempts: { $ifNull: ['$totalAttempts', 0] },
      _previousAvgTimeSeconds: { $ifNull: ['$avgTimeSeconds', 0] },
      totalAttempts: { $ifNull: ['$totalAttempts', 0] },
      correctAttempts: { $ifNull: ['$correctAttempts', 0] },
      wrongAttempts: { $ifNull: ['$wrongAttempts', 0] },
      unattemptedCount: { $ifNull: ['$unattemptedCount', 0] },
    },
  },
  {
    $set: {
      totalAttempts: { $add: ['$_previousTotalAttempts', totalAttempts] },
      correctAttempts: { $add: ['$correctAttempts', correctAttempts] },
      wrongAttempts: { $add: ['$wrongAttempts', wrongAttempts] },
      unattemptedCount: { $add: ['$unattemptedCount', unattemptedCount] },
      avgTimeSeconds: {
        $cond: [
          { $gt: [{ $add: ['$_previousTotalAttempts', totalAttempts] }, 0] },
          {
            $divide: [
              {
                $add: [
                  { $multiply: ['$_previousAvgTimeSeconds', '$_previousTotalAttempts'] },
                  totalTimeSeconds,
                ],
              },
              { $add: ['$_previousTotalAttempts', totalAttempts] },
            ],
          },
          0,
        ],
      },
      lastAttemptDate: new Date(),
    },
  },
  {
    $set: {
      accuracy: {
        $cond: [
          { $gt: ['$totalAttempts', 0] },
          { $multiply: [{ $divide: ['$correctAttempts', '$totalAttempts'] }, 100] },
          0,
        ],
      },
    },
  },
  {
    $set: {
      confidenceScore: {
        $min: [
          100,
          {
            $add: [
              { $multiply: ['$accuracy', 0.9] },
              { $cond: [{ $gt: ['$totalAttempts', 5] }, 10, 0] },
            ],
          },
        ],
      },
      strengthLevel: buildStrengthLevelExpression(),
    },
  },
  {
    $unset: ['_previousTotalAttempts', '_previousAvgTimeSeconds'],
  },
]);

const applyAnalyticsAggregateUpdate = async (aggregate, options = {}) => {
  if (!aggregate || aggregate.totalAttempts <= 0) {
    return;
  }

  const query = {
    userId: aggregate.userId,
    subject: aggregate.subject,
    topic: aggregate.topic,
  };

  const updateOptions = { upsert: true };
  if (options.session) {
    updateOptions.session = options.session;
  }

  await PerformanceAnalytics.updateOne(
    query,
    buildAnalyticsUpdatePipeline(aggregate),
    updateOptions,
  );
};

module.exports = {
  applyAnalyticsAggregateUpdate,
};