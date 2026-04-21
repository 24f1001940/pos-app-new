const dayjs = require('dayjs');

const Sale = require('../models/sale.model');
const Product = require('../models/product.model');
const { roundCurrency } = require('../utils/calculations');

function movingAverage(values) {
  if (!values.length) {
    return 0;
  }

  return roundCurrency(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function buildDailyBuckets(sales, days = 14) {
  const now = dayjs();
  const buckets = [];

  for (let index = days - 1; index >= 0; index -= 1) {
    const day = now.subtract(index, 'day');
    buckets.push({
      key: day.format('YYYY-MM-DD'),
      label: day.format('DD MMM'),
      revenue: 0,
      orders: 0,
    });
  }

  const map = new Map(buckets.map((bucket) => [bucket.key, bucket]));
  sales.forEach((sale) => {
    const key = dayjs(sale.date).format('YYYY-MM-DD');
    const bucket = map.get(key);
    if (!bucket) {
      return;
    }

    bucket.revenue = roundCurrency(bucket.revenue + Number(sale.total || 0));
    bucket.orders += 1;
  });

  return buckets;
}

function buildDemandForecast(sales) {
  const buckets = buildDailyBuckets(sales, 14);
  const lastSeven = buckets.slice(-7).map((bucket) => bucket.revenue);
  const previousSeven = buckets.slice(-14, -7).map((bucket) => bucket.revenue);

  const nextDayEstimate = movingAverage(lastSeven);
  const weeklyTrend = movingAverage(lastSeven) - movingAverage(previousSeven);

  return {
    nextDayEstimate,
    weeklyTrend: roundCurrency(weeklyTrend),
    series: buckets,
  };
}

function buildRecommendations(sales) {
  const scores = new Map();

  sales.forEach((sale) => {
    sale.items.forEach((item) => {
      const key = String(item.product || item.name);
      const current = scores.get(key) || {
        productId: item.product ? String(item.product) : '',
        name: item.name,
        quantity: 0,
        revenue: 0,
      };

      current.quantity += Number(item.quantity || 0);
      current.revenue = roundCurrency(current.revenue + Number(item.subtotal || 0));
      scores.set(key, current);
    });
  });

  return Array.from(scores.values())
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 8);
}

function detectFraudSignals(sales) {
  return sales
    .filter((sale) => {
      const discountAmount = Number(sale.discountAmount || 0);
      const discountRatio = Number(sale.subtotal || 0) > 0 ? discountAmount / Number(sale.subtotal) : 0;
      const cashPayment = String(sale.paymentMethod || '').toLowerCase() === 'cash';
      const unpaidLargeSale = Number(sale.total || 0) >= 50000 && Number(sale.balanceDue || 0) > 0;
      return (cashPayment && discountRatio >= 0.25) || unpaidLargeSale;
    })
    .slice(0, 20)
    .map((sale) => ({
      id: sale.id,
      invoiceNumber: sale.invoiceNumber,
      date: sale.date,
      total: sale.total,
      paymentMethod: sale.paymentMethod,
      discountAmount: sale.discountAmount,
      balanceDue: sale.balanceDue,
      reason:
        Number(sale.balanceDue || 0) > 0 && Number(sale.total || 0) >= 50000
          ? 'High-value sale with pending balance'
          : 'High discount with cash payment',
    }));
}

async function getAiInsights() {
  const since = dayjs().subtract(60, 'day').toDate();
  const [sales, lowStockProducts] = await Promise.all([
    Sale.find({ date: { $gte: since } }).sort({ date: 1 }).lean(),
    Product.find({ $expr: { $lte: ['$stock', '$lowStockLimit'] } })
      .select('name stock lowStockLimit category')
      .lean(),
  ]);

  const forecast = buildDemandForecast(sales);

  return {
    generatedAt: new Date().toISOString(),
    demandForecast: forecast,
    recommendations: buildRecommendations(sales),
    fraudSignals: detectFraudSignals(sales),
    lowStockHotspots: lowStockProducts.map((product) => ({
      id: String(product._id),
      name: product.name,
      category: product.category,
      stock: product.stock,
      lowStockLimit: product.lowStockLimit,
    })),
  };
}

module.exports = {
  getAiInsights,
};
