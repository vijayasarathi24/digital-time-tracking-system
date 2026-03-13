const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const { isAuthenticated } = require('../middleware/auth');
const { checkRole } = require('../middleware/role');

router.use(isAuthenticated, checkRole('user'));

// Core Timer Actions
router.post('/timer/start', userController.startTimer);
router.post('/timer/pause', userController.pauseTimer);
router.post('/timer/resume', userController.resumeTimer);
router.post('/timer/stop', userController.stopTimer);
router.get('/timer/status', userController.getTimerStatus);

// Analytics & Reports
router.get('/reports', userController.getReports);
router.get('/reports/summary', userController.getReportsSummary);
router.get('/reports/metrics', userController.getReportsMetrics);
router.get('/today-average', userController.getTodayAverage);
router.get('/recent-activities', userController.getRecentActivities);

// Profile
router.get('/profile', userController.getProfile);

// Aliases for dashboard compatibility (matching dashboard fetch calls)
router.post('/start-work', userController.startTimer);
router.post('/end-work', userController.stopTimer);
router.post('/init-project', userController.startTimer);
router.post('/end-project', userController.stopTimer);

module.exports = router;
