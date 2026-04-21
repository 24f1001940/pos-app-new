const multer = require('multer');

const { createHttpError } = require('../utils/http');

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter: (req, file, callback) => {
    if (!file.mimetype.startsWith('image/')) {
      return callback(createHttpError(400, 'Only image files are allowed'));
    }

    return callback(null, true);
  },
});

module.exports = {
  upload,
};
