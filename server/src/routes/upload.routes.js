const express = require('express');

const { uploadImage } = require('../controllers/upload.controller');
const { protect, authorize } = require('../middlewares/auth.middleware');
const { upload } = require('../middlewares/upload.middleware');
const { ROLES } = require('../constants/roles');

const router = express.Router();

router.post(
  '/image',
  protect,
  authorize(ROLES.ADMIN, ROLES.STAFF),
  upload.single('image'),
  uploadImage,
);

module.exports = router;
