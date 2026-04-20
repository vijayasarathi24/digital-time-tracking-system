const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');

router.post('/register', authController.register);
router.post('/login', authController.userLogin); // Unified login for users and admins
router.post('/admin/login', authController.adminLogin);
router.post('/user/login', authController.userLogin);
router.post('/logout', authController.logout);
router.get('/session', authController.getSession);

module.exports = router;
