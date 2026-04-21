const dayjs = require('dayjs');

const Product = require('../models/product.model');
const Sale = require('../models/sale.model');
const { roundCurrency } = require('../utils/calculations');

function getBucketLabel(date, type) {
  if (type === 'daily') {
    return dayjs(date).format('DD MMM');
  }

  if (type === 'weekly') {
    return `W${dayjs(date).week?.() || dayjs(date).format('WW')}`;
  }

  return dayjs(date).format('MMM YY');
}

function createSalesSeries(sales, type) {
  const today = dayjs();
  const buckets = [];
  const length = type === 'daily' ? 7 : type === 'weekly' ? 8 : 6;

  for (let index = length - 1; index >= 0; index -= 1) {
    const date =
      type === 'daily'
        ? today.subtract(index, 'day')
        : type === 'weekly'
          ? today.subtract(index, 'week')
          : today.subtract(index, 'month');

    const key =
      type === 'daily'
        ? date.format('YYYY-MM-DD')
        : type === 'weekly'
          ? `${date.year()}-${date.startOf('week').format('MM-DD')}`
          : date.format('YYYY-MM');

    buckets.push({
      key,
      label: type === 'weekly' ? `${date.startOf('week').format('DD MMM')}` : getBucketLabel(date, type),
      total: 0,
      orders: 0,
    });
  }

  const bucketMap = new Map(buckets.map((bucket) => [bucket.key, bucket]));

  sales.forEach((sale) => {
    const saleDate = dayjs(sale.date);
    const key =
      type === 'daily'
        ? saleDate.format('YYYY-MM-DD')
        : type === 'weekly'
          ? `${saleDate.year()}-${saleDate.startOf('week').format('MM-DD')}`
          : saleDate.format('YYYY-MM');

    const bucket = bucketMap.get(key);
    if (bucket) {
      bucket.total = roundCurrency(bucket.total + sale.total);
      bucket.orders += 1;
    }
  });

  return buckets;
}

async function getDashboardData() {
  const [products, sales, categoryDistribution] = await Promise.all([
    Product.find().sort({ stock: 1 }).lean(),
    Sale.find().sort({ date: -1 }).lean(),
    Product.aggregate([
      {
        $project: {
          category: {
            $trim: {
              input: { $ifNull: ['$category', ''] },
            },
          },
          stock: { $ifNull: ['$stock', 0] },
          sp: { $ifNull: ['$sp', 0] },
        },
      },
      {
        $addFields: {
          category: {
            $cond: [{ $eq: ['$category', ''] }, 'Uncategorized', '$category'],
          },
        },
      },
      {
        $group: {
          _id: '$category',
          value: { $sum: 1 },
          stockValue: {
            $sum: {
              $multiply: ['$stock', '$sp'],
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          name: '$_id',
          value: 1,
          stockValue: 1,
        },
      },
      {
        $sort: { value: -1, name: 1 },
      },
    ]),
  ]);

  const startOfToday = dayjs().startOf('day');
  const todaySales = sales.filter((sale) => dayjs(sale.date).isAfter(startOfToday));
  const lowStockItems = products.filter((product) => product.stock <= product.lowStockLimit);
  const totalRevenue = roundCurrency(sales.reduce((sum, sale) => sum + sale.total, 0));
  const totalProfit = roundCurrency(sales.reduce((sum, sale) => sum + sale.profit, 0));
  const totalSalesCount = sales.length;

  const topProductsMap = {};
  sales.forEach((sale) => {
    sale.items.forEach((item) => {
      if (!topProductsMap[item.name]) {
        topProductsMap[item.name] = {
          name: item.name,
          quantity: 0,
          revenue: 0,
          profit: 0,
        };
      }

      topProductsMap[item.name].quantity += item.quantity;
      topProductsMap[item.name].revenue = roundCurrency(
        topProductsMap[item.name].revenue + item.subtotal,
      );
      topProductsMap[item.name].profit = roundCurrency(
        topProductsMap[item.name].profit + item.profit,
      );
    });
  });

  const topSellingProducts = Object.values(topProductsMap)
    .sort((left, right) => right.quantity - left.quantity)
    .slice(0, 5);

  return {
    summary: {
      totalProducts: products.length,
      todaysSales: roundCurrency(todaySales.reduce((sum, sale) => sum + sale.total, 0)),
      todaysOrders: todaySales.length,
      totalRevenue,
      totalProfit,
      totalSalesCount,
      lowStockCount: lowStockItems.length,
    },
    lowStockItems: lowStockItems.slice(0, 8),
    charts: {
      salesOverview: {
        daily: createSalesSeries(sales, 'daily'),
        weekly: createSalesSeries(sales, 'weekly'),
        monthly: createSalesSeries(sales, 'monthly'),
      },
      categoryDistribution: categoryDistribution.map((item) => ({
        ...item,
        stockValue: roundCurrency(item.stockValue),
      })),
      topSellingProducts,
    },
    reports: {
      revenueTrends: createSalesSeries(sales, 'monthly'),
      bestSellingProducts: topSellingProducts,
      profitAnalysis: {
        revenue: totalRevenue,
        profit: totalProfit,
        costs: roundCurrency(totalRevenue - totalProfit),
      },
    },
  };
}

module.exports = {
  getDashboardData,
};
