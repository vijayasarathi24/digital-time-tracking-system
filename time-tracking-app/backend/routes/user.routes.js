const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const { isAuthenticated } = require('../middleware/auth');
const { checkRole } = require('../middleware/role');

router.use(isAuthenticated, checkRole('user'));

router.post('/timer/start', userController.startTimer);
router.post('/timer/pause', userController.pauseTimer);
router.post('/timer/resume', userController.resumeTimer);
router.post('/timer/stop', userController.stopTimer);
router.get('/reports', userController.getReports);
router.get('/timer/status', userController.getTimerStatus); // Helper for UI sync

module.exports = router;
