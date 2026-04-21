const asyncHandler = require('../utils/async-handler');
const { getDashboardData } = require('../services/dashboard.service');

const getDashboard = asyncHandler(async (req, res) => {
  const dashboard = await getDashboardData();
  res.json(dashboard);
});

module.exports = {
  getDashboard,
};
