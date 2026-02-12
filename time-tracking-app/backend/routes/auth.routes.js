const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');

router.post('/login', authController.login);
router.post('/admin/login', authController.adminLogin);
router.post('/user/login', authController.userLogin);
router.post('/logout', authController.logout);
router.get('/session', authController.getSession);

module.exports = router;
