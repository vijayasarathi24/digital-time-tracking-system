const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const { isAuthenticated } = require('../middleware/auth');
const { checkRole } = require('../middleware/role');

// Apply middleware to all admin routes
router.use(isAuthenticated, checkRole('admin'));

router.get('/dashboard', adminController.getDashboardStats);
router.get('/users', adminController.getAllUsers);
router.get('/users/:id', adminController.getUserById);
router.post('/users', adminController.createUser);
router.put('/users/:id', adminController.updateUser);
router.delete('/users/:id', adminController.deleteUser);
router.put('/reset-user-password/:id', adminController.resetUserPassword);
router.put('/change-password', adminController.changePassword);
router.get('/reports', adminController.getReports);

module.exports = router;
