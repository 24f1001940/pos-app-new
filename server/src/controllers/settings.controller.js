const Settings = require('../models/settings.model');
const asyncHandler = require('../utils/async-handler');
const { createHttpError } = require('../utils/http');
const { exportBackupData, restoreBackupData, resetBusinessData } = require('../services/backup.service');
const { getOrCreateSettings } = require('../services/settings.service');

const getSettings = asyncHandler(async (req, res) => {
  const settings = await getOrCreateSettings();
  res.json(settings);
});

const updateSettings = asyncHandler(async (req, res) => {
  const settings = await Settings.findOneAndUpdate(
    { shopCode: 'default' },
    { ...req.body, shopCode: 'default' },
    {
      returnDocument: 'after',
      upsert: true,
      setDefaultsOnInsert: true,
      runValidators: true,
    },
  );

  res.json(settings);
});

const backupData = asyncHandler(async (req, res) => {
  const backup = await exportBackupData();
  res.json(backup);
});

const restoreData = asyncHandler(async (req, res) => {
  if (!req.body || typeof req.body !== 'object') {
    throw createHttpError(400, 'A valid backup payload is required');
  }

  const result = await restoreBackupData(req.body);
  res.json({
    message: 'Backup restored successfully',
    ...result,
  });
});

const resetSystem = asyncHandler(async (req, res) => {
  if (req.body.confirmation !== 'RESET MUJAHID ELECTRONIC GOODS') {
    throw createHttpError(400, 'Confirmation phrase does not match');
  }

  await resetBusinessData();
  await Settings.deleteMany({});
  await Settings.create({ shopCode: 'default' });

  res.json({
    message: 'Business data reset successfully',
  });
});

module.exports = {
  getSettings,
  updateSettings,
  backupData,
  restoreData,
  resetSystem,
};
