const asyncHandler = require('../utils/async-handler');
const { getAiInsights } = require('../services/ai.service');

const getAiInsightsController = asyncHandler(async (req, res) => {
  const insights = await getAiInsights();
  res.json(insights);
});

module.exports = {
  getAiInsightsController,
};
