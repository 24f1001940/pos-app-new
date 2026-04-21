const Settings = require('../models/settings.model');

async function getOrCreateSettings() {
  return Settings.findOneAndUpdate(
    { shopCode: 'default' },
    {},
    {
      returnDocument: 'after',
      upsert: true,
      setDefaultsOnInsert: true,
    },
  );
}

module.exports = {
  getOrCreateSettings,
};
