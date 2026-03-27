const express = require('express');
const router = express.Router();
const { verifyToken, authorizeRoles } = require('../middleware/auth');
const {
    getBatchOverview,
    getSubjectPerformance,
    getWeaknessHeatmap,
    getReadinessDistribution
} = require('../controllers/batchAnalytics.controller');

// Analytics are available to admins globally and to teachers within assigned batches.
router.get('/overview', verifyToken, authorizeRoles('admin', 'teacher'), getBatchOverview);
router.get('/subject-performance', verifyToken, authorizeRoles('admin', 'teacher'), getSubjectPerformance);
router.get('/weakness-heatmap', verifyToken, authorizeRoles('admin', 'teacher'), getWeaknessHeatmap);
router.get('/readiness-distribution', verifyToken, authorizeRoles('admin', 'teacher'), getReadinessDistribution);

module.exports = router;
