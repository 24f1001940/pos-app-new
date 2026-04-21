const express = require('express');

const { getDashboard } = require('../controllers/dashboard.controller');
const { protect } = require('../middlewares/auth.middleware');

const router = express.Router();

router.use(protect);
router.get('/', getDashboard);

module.exports = router;
