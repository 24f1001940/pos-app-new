const asyncHandler = require('../utils/async-handler');
const { createHttpError } = require('../utils/http');
const { cloudinary, isCloudinaryConfigured } = require('../config/cloudinary');

const uploadImage = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw createHttpError(400, 'Please attach an image file');
  }

  const dataUri = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;

  if (!isCloudinaryConfigured) {
    return res.status(201).json({
      url: dataUri,
      publicId: '',
      warning: 'Cloudinary is not configured, so the image is stored inline for local development.',
    });
  }

  const result = await cloudinary.uploader.upload(dataUri, {
    folder: 'mujahid-electronic-goods',
    resource_type: 'image',
  });

  return res.status(201).json({
    url: result.secure_url,
    publicId: result.public_id,
  });
});

module.exports = {
  uploadImage,
};
