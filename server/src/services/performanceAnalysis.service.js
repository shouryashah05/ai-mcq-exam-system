const PerformanceAnalytics = require('../models/performanceAnalytics.model');
const TestAttemptMeta = require('../models/testAttemptMeta.model');
const Question = require('../models/question.model');
const ExamAttempt = require('../models/examAttempt.model');
const { applyAnalyticsAggregateUpdate } = require('./analyticsAggregation.service');
const logger = require('../utils/logger');

const resolveDifficultyProfile = (difficultyCounts) => {
    const entries = Object.entries(difficultyCounts).filter(([, count]) => count > 0);
    if (entries.length === 0) {
        return 'Standard';
    }

    entries.sort((left, right) => right[1] - left[1]);
    if (entries.length > 1 && entries[0][1] === entries[1][1]) {
        return 'Mixed';
    }

    return entries[0][0];
};

exports.analyzeAttempt = async (attemptId) => {
    logger.info('Analyzing attempt metadata', { attemptId });

    const attempt = await ExamAttempt.findById(attemptId).populate('answers.questionId');
    if (!attempt) throw new Error('Attempt not found');

    const userId = attempt.user;
    const answers = attempt.answers;

    // Track metrics per topic for this specific attempt
    const topicStats = {}; // { topicName: { total, correct, time } }
    let totalTime = 0;
    let fastAnswers = 0;
    const difficultyCounts = { Easy: 0, Medium: 0, Hard: 0 };

    for (const ans of answers) {
        const question = ans.questionId;
        if (!question) continue;

        const subject = question.subject || ans.subject || 'Aptitude';
        const topic = question.topic || 'General';
        const isCorrect = ans.isCorrect;
        const timeSpent = ans.timeSpentSeconds || 0;

        if (!topicStats[topic]) {
            topicStats[topic] = { total: 0, correct: 0, time: 0, difficultySum: 0 };
        }

        difficultyCounts[question.difficulty] = (difficultyCounts[question.difficulty] || 0) + 1;

        topicStats[topic].total++;
        if (isCorrect) topicStats[topic].correct++;
        topicStats[topic].time += timeSpent;
        totalTime += timeSpent;

        // Simple heuristic for guesswork: < 5 seconds for a non-trivial question
        if (timeSpent < 5) fastAnswers++;
    }

    // 1. Update Global TopicPerformance (PerformanceAnalytics)
    const topicUpdates = [];
    for (const [topic, stats] of Object.entries(topicStats)) {
        const sampleAnswer = answers.find(ans => (ans.questionId?.topic || 'General') === topic);
        const subject = sampleAnswer?.questionId?.subject || sampleAnswer?.subject || 'Aptitude';
        await applyAnalyticsAggregateUpdate({
            userId,
            subject,
            topic,
            totalAttempts: stats.total,
            correctAttempts: stats.correct,
            wrongAttempts: stats.total - stats.correct,
            unattemptedCount: 0,
            totalTimeSeconds: stats.time,
            lastDifficultyLevel: sampleAnswer?.questionId?.difficulty || 'Medium',
        });
        topicUpdates.push({ topic, score: (stats.correct / stats.total) * 100 });
    }

    const refreshedAnalytics = await PerformanceAnalytics.find({
        userId,
        topic: { $in: Object.keys(topicStats) },
    });
    const strengthByTopic = new Map(refreshedAnalytics.map((entry) => [entry.topic, entry.strengthLevel]));

    // 2. Create TestAttemptMeta
    const meta = new TestAttemptMeta({
        attemptId: attempt._id,
        timeManagementScore: Math.min(100, Math.max(0, 100 - (fastAnswers * 5))), // Penalize fast answers
        guessWorkDetected: fastAnswers > (answers.length * 0.3), // >30% fast answers = guessing
        difficultyProfile: resolveDifficultyProfile(difficultyCounts),
        topicPerformance: topicUpdates.map(t => ({
            topic: t.topic,
            score: t.score,
            totalQuestions: topicStats[t.topic].total,
            strength: strengthByTopic.get(t.topic) || 'Unassessed'
        })),
        adaptiveDecisions: [`Analyzed ${answers.length} questions across ${Object.keys(topicStats).length} topics.`]
    });

    await meta.save();
    logger.info('Attempt metadata analysis complete', { attemptId });
    return meta;
};
