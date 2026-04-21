const express = require('express');

const {
	getBootstrapStatus,
	register,
	login,
	refresh,
	logout,
	logoutAll,
	getActivityLogs,
	me,
} = require('../controllers/auth.controller');
const { attachUserIfExists, protect } = require('../middlewares/auth.middleware');
const { handleValidation } = require('../middlewares/validate.middleware');
const { loginValidator, registerValidator } = require('../validators/auth.validator');

const router = express.Router();

router.get('/bootstrap', getBootstrapStatus);
router.post('/register', attachUserIfExists, registerValidator, handleValidation, register);
router.post('/login', loginValidator, handleValidation, login);
router.post('/refresh', refresh);
router.get('/me', protect, me);
router.post('/logout', protect, logout);
router.post('/logout-all', protect, logoutAll);
router.get('/activity-logs', protect, getActivityLogs);

module.exports = router;
