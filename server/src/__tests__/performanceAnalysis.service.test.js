jest.mock('../models/performanceAnalytics.model', () => ({
  find: jest.fn(),
}));

jest.mock('../models/examAttempt.model', () => ({
  findById: jest.fn(),
}));

jest.mock('../services/analyticsAggregation.service', () => ({
  applyAnalyticsAggregateUpdate: jest.fn(),
}));

const mockSave = jest.fn();

jest.mock('../models/testAttemptMeta.model', () => {
  return jest.fn().mockImplementation(function MockTestAttemptMeta(data) {
    Object.assign(this, data);
    this.save = mockSave;
  });
});

const PerformanceAnalytics = require('../models/performanceAnalytics.model');
const ExamAttempt = require('../models/examAttempt.model');
const TestAttemptMeta = require('../models/testAttemptMeta.model');
const { applyAnalyticsAggregateUpdate } = require('../services/analyticsAggregation.service');
const performanceAnalysisService = require('../services/performanceAnalysis.service');

describe('performanceAnalysisService.analyzeAttempt', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSave.mockResolvedValue(undefined);
  });

  test('analyzes an attempt without referencing undefined analytics state', async () => {
    ExamAttempt.findById.mockReturnValue({
      populate: jest.fn().mockResolvedValue({
        _id: 'attempt-1',
        user: 'user-1',
        answers: [
          {
            questionId: {
              subject: 'DBMS',
              topic: 'Joins',
              difficulty: 'Medium',
            },
            isCorrect: true,
            timeSpentSeconds: 18,
          },
        ],
      }),
    });

    PerformanceAnalytics.find.mockResolvedValue([
      { topic: 'Joins', strengthLevel: 'Strong' },
    ]);

    const meta = await performanceAnalysisService.analyzeAttempt('attempt-1');

    expect(applyAnalyticsAggregateUpdate).toHaveBeenCalledWith(expect.objectContaining({
      userId: 'user-1',
      subject: 'DBMS',
      topic: 'Joins',
      totalAttempts: 1,
      correctAttempts: 1,
      wrongAttempts: 0,
      totalTimeSeconds: 18,
      lastDifficultyLevel: 'Medium',
    }));
    expect(PerformanceAnalytics.find).toHaveBeenCalledWith({
      userId: 'user-1',
      topic: { $in: ['Joins'] },
    });
    expect(TestAttemptMeta).toHaveBeenCalledTimes(1);
    expect(mockSave).toHaveBeenCalledTimes(1);
    expect(meta.topicPerformance).toEqual([
      expect.objectContaining({
        topic: 'Joins',
        score: 100,
        totalQuestions: 1,
        strength: 'Strong',
      }),
    ]);
  });
});