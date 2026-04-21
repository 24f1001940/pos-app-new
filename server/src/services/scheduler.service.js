const dayjs = require('dayjs');

const env = require('../config/env');
const { createDailySalesSummaryNotification } = require('./notification.service');

let schedulerHandle = null;
let lastRunDate = '';

async function runDailySummaryIfNeeded() {
  const currentDate = dayjs().format('YYYY-MM-DD');
  const currentHour = dayjs().hour();

  if (lastRunDate === currentDate || currentHour < env.dailySummaryHour) {
    return;
  }

  await createDailySalesSummaryNotification();
  lastRunDate = currentDate;
}

function startSchedulers() {
  if (!env.enableDailySummaryScheduler || schedulerHandle) {
    return;
  }

  schedulerHandle = setInterval(() => {
    runDailySummaryIfNeeded().catch(() => {});
  }, 15 * 60 * 1000);
}

module.exports = {
  startSchedulers,
};
