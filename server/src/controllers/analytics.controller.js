const asyncHandler = require('../utils/async-handler');
const { exportAnalyticsReport, getAnalyticsOverview } = require('../services/analytics.service');

function parsePositiveInt(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

const getAnalyticsOverviewController = asyncHandler(async (req, res) => {
  const overview = await getAnalyticsOverview({
    bestSellingPage: parsePositiveInt(req.query.bestSellingPage, 1),
    bestSellingLimit: parsePositiveInt(req.query.bestSellingLimit, 10),
    worstPerformingPage: parsePositiveInt(req.query.worstPerformingPage, 1),
    worstPerformingLimit: parsePositiveInt(req.query.worstPerformingLimit, 10),
    topCustomersPage: parsePositiveInt(req.query.topCustomersPage, 1),
    topCustomersLimit: parsePositiveInt(req.query.topCustomersLimit, 10),
    categoryPage: parsePositiveInt(req.query.categoryPage, 1),
    categoryLimit: parsePositiveInt(req.query.categoryLimit, 10),
  });
  res.json(overview);
});

const exportAnalyticsController = asyncHandler(async (req, res) => {
  const report = await exportAnalyticsReport({
    report: req.query.report || 'sales',
  });

  res.setHeader('Content-Type', report.contentType);
  res.setHeader('Content-Disposition', `attachment; filename="${report.fileName}"`);
  res.send(report.content);
});

module.exports = {
  getAnalyticsOverviewController,
  exportAnalyticsController,
};
