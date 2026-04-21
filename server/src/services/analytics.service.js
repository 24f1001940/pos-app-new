const dayjs = require('dayjs');

const Customer = require('../models/customer.model');
const Product = require('../models/product.model');
const Sale = require('../models/sale.model');
const { roundCurrency } = require('../utils/calculations');

function paginateList(items, page = 1, limit = 10) {
  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.max(1, Number(limit) || 10);
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / safeLimit));
  const start = (safePage - 1) * safeLimit;

  return {
    data: items.slice(start, start + safeLimit),
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages,
    },
  };
}

function createSeries(sales, type) {
  const now = dayjs();
  const lengthMap = {
    daily: 14,
    weekly: 12,
    monthly: 12,
    yearly: 5,
  };

  const length = lengthMap[type] || 12;
  const buckets = [];

  for (let index = length - 1; index >= 0; index -= 1) {
    const date =
      type === 'daily'
        ? now.subtract(index, 'day')
        : type === 'weekly'
          ? now.subtract(index, 'week')
          : type === 'monthly'
            ? now.subtract(index, 'month')
            : now.subtract(index, 'year');

    const key =
      type === 'daily'
        ? date.format('YYYY-MM-DD')
        : type === 'weekly'
          ? `${date.year()}-${date.startOf('week').format('MM-DD')}`
          : type === 'monthly'
            ? date.format('YYYY-MM')
            : date.format('YYYY');

    buckets.push({
      key,
      label:
        type === 'daily'
          ? date.format('DD MMM')
          : type === 'weekly'
            ? `${date.startOf('week').format('DD MMM')}`
            : type === 'monthly'
              ? date.format('MMM YY')
              : date.format('YYYY'),
      revenue: 0,
      profit: 0,
      orders: 0,
    });
  }

  const map = new Map(buckets.map((bucket) => [bucket.key, bucket]));

  sales.forEach((sale) => {
    const saleDate = dayjs(sale.date);
    const key =
      type === 'daily'
        ? saleDate.format('YYYY-MM-DD')
        : type === 'weekly'
          ? `${saleDate.year()}-${saleDate.startOf('week').format('MM-DD')}`
          : type === 'monthly'
            ? saleDate.format('YYYY-MM')
            : saleDate.format('YYYY');

    const target = map.get(key);
    if (!target) {
      return;
    }

    target.revenue = roundCurrency(target.revenue + Number(sale.total || 0));
    target.profit = roundCurrency(target.profit + Number(sale.profit || 0));
    target.orders += 1;
  });

  return buckets;
}

function buildProductPerformance(sales) {
  const map = new Map();

  sales.forEach((sale) => {
    sale.items.forEach((item) => {
      const id = String(item.product || item.sku || item.name);
      const current = map.get(id) || {
        name: item.name,
        sku: item.sku || '',
        quantity: 0,
        revenue: 0,
        profit: 0,
      };

      current.quantity += Number(item.quantity || 0);
      current.revenue = roundCurrency(current.revenue + Number(item.subtotal || 0));
      current.profit = roundCurrency(current.profit + Number(item.profit || 0));

      map.set(id, current);
    });
  });

  const values = Array.from(map.values());
  const bestSelling = values
    .slice()
    .sort((a, b) => b.quantity - a.quantity);

  const worstPerforming = values
    .slice()
    .sort((a, b) => a.quantity - b.quantity);

  return {
    bestSelling,
    worstPerforming,
  };
}

function buildCategoryRevenue(sales) {
  const map = new Map();

  sales.forEach((sale) => {
    sale.items.forEach((item) => {
      const key = item.category || 'Uncategorized';
      const current = map.get(key) || { name: key, revenue: 0, quantity: 0 };
      current.revenue = roundCurrency(current.revenue + Number(item.subtotal || 0));
      current.quantity += Number(item.quantity || 0);
      map.set(key, current);
    });
  });

  return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue);
}

function buildPeakHour(sales) {
  const buckets = Array.from({ length: 24 }).map((_, hour) => ({
    hour,
    label: `${String(hour).padStart(2, '0')}:00`,
    orders: 0,
    revenue: 0,
  }));

  sales.forEach((sale) => {
    const hour = dayjs(sale.date).hour();
    const target = buckets[hour];
    target.orders += 1;
    target.revenue = roundCurrency(target.revenue + Number(sale.total || 0));
  });

  const peak = buckets.slice().sort((a, b) => b.orders - a.orders)[0] || buckets[0];

  return {
    buckets,
    peak,
  };
}

function buildCustomerAnalytics(customers, sales) {
  const activeCustomers = customers.filter((customer) => Number(customer.totalPurchases || 0) > 0);
  const segments = [
    {
      name: 'VIP',
      count: customers.filter((customer) => Number(customer.totalSpent || 0) >= 100000).length,
    },
    {
      name: 'Regular',
      count: customers.filter(
        (customer) => Number(customer.totalSpent || 0) >= 10000 && Number(customer.totalSpent || 0) < 100000,
      ).length,
    },
    {
      name: 'Occasional',
      count: customers.filter((customer) => Number(customer.totalSpent || 0) > 0 && Number(customer.totalSpent || 0) < 10000)
        .length,
    },
    {
      name: 'New',
      count: customers.filter((customer) => Number(customer.totalSpent || 0) <= 0).length,
    },
  ];

  return {
    totalCustomers: customers.length,
    activeCustomers: activeCustomers.length,
    averageOrderValue: sales.length
      ? roundCurrency(sales.reduce((sum, sale) => sum + Number(sale.total || 0), 0) / sales.length)
      : 0,
    segments,
    topCustomers: customers
      .slice()
      .sort((a, b) => Number(b.totalSpent || 0) - Number(a.totalSpent || 0)),
  };
}

function buildGrowth(series) {
  if (!series.length) {
    return { current: 0, previous: 0, percentage: 0 };
  }

  const current = Number(series[series.length - 1]?.revenue || 0);
  const previous = Number(series[series.length - 2]?.revenue || 0);

  if (!previous) {
    return {
      current,
      previous,
      percentage: current > 0 ? 100 : 0,
    };
  }

  return {
    current,
    previous,
    percentage: roundCurrency(((current - previous) / previous) * 100),
  };
}

function buildInventoryTurnover(products, sales) {
  const cogs = roundCurrency(sales.reduce((sum, sale) => sum + Number(sale.total || 0) - Number(sale.profit || 0), 0));
  const inventoryValue = roundCurrency(
    products.reduce((sum, product) => sum + Number(product.stock || 0) * Number(product.cp || 0), 0),
  );

  return {
    cogs,
    averageInventoryValue: inventoryValue,
    turnoverRatio: inventoryValue > 0 ? roundCurrency(cogs / inventoryValue) : 0,
  };
}

async function getAnalyticsOverview(options = {}) {
  const {
    bestSellingPage = 1,
    bestSellingLimit = 10,
    worstPerformingPage = 1,
    worstPerformingLimit = 10,
    topCustomersPage = 1,
    topCustomersLimit = 10,
    categoryPage = 1,
    categoryLimit = 10,
  } = options;

  const [sales, products, customers] = await Promise.all([
    Sale.find().sort({ date: 1 }).lean(),
    Product.find().lean(),
    Customer.find().lean(),
  ]);

  const revenueByPeriod = {
    daily: createSeries(sales, 'daily'),
    weekly: createSeries(sales, 'weekly'),
    monthly: createSeries(sales, 'monthly'),
    yearly: createSeries(sales, 'yearly'),
  };

  const profitAndLoss = {
    revenue: roundCurrency(sales.reduce((sum, sale) => sum + Number(sale.total || 0), 0)),
    profit: roundCurrency(sales.reduce((sum, sale) => sum + Number(sale.profit || 0), 0)),
  };
  profitAndLoss.costs = roundCurrency(profitAndLoss.revenue - profitAndLoss.profit);

  const productPerformance = buildProductPerformance(sales);
  const customerAnalytics = buildCustomerAnalytics(customers, sales);
  const categoryRevenue = buildCategoryRevenue(sales);

  const bestSellingPaginated = paginateList(
    productPerformance.bestSelling,
    bestSellingPage,
    bestSellingLimit,
  );
  const worstPerformingPaginated = paginateList(
    productPerformance.worstPerforming,
    worstPerformingPage,
    worstPerformingLimit,
  );
  const topCustomersPaginated = paginateList(
    customerAnalytics.topCustomers,
    topCustomersPage,
    topCustomersLimit,
  );
  const categoryRevenuePaginated = paginateList(categoryRevenue, categoryPage, categoryLimit);

  return {
    profitAndLoss,
    revenueByPeriod,
    revenueGrowth: buildGrowth(revenueByPeriod.monthly),
    bestSelling: bestSellingPaginated.data,
    worstPerforming: worstPerformingPaginated.data,
    categoryRevenue: categoryRevenuePaginated.data,
    customerAnalytics: {
      ...customerAnalytics,
      topCustomers: topCustomersPaginated.data,
    },
    pagination: {
      bestSelling: bestSellingPaginated.pagination,
      worstPerforming: worstPerformingPaginated.pagination,
      categoryRevenue: categoryRevenuePaginated.pagination,
      topCustomers: topCustomersPaginated.pagination,
    },
    peakSales: buildPeakHour(sales),
    inventoryTurnover: buildInventoryTurnover(products, sales),
  };
}

function escapeCsv(value) {
  const normalized = String(value ?? '');
  if (normalized.includes(',') || normalized.includes('"') || normalized.includes('\n')) {
    return `"${normalized.replace(/"/g, '""')}"`;
  }

  return normalized;
}

function toCsv(rows) {
  return rows.map((row) => row.map(escapeCsv).join(',')).join('\n');
}

async function exportAnalyticsReport({ report = 'sales' } = {}) {
  if (report === 'sales') {
    const sales = await Sale.find().sort({ date: -1 }).lean();

    const rows = [['Invoice', 'Date', 'Customer', 'Payment', 'Status', 'Total', 'Profit']];
    sales.forEach((sale) => {
      rows.push([
        sale.invoiceNumber,
        dayjs(sale.date).format('YYYY-MM-DD HH:mm'),
        sale.customerName || 'Walk-in',
        sale.paymentMethod,
        sale.status || 'completed',
        Number(sale.total || 0).toFixed(2),
        Number(sale.profit || 0).toFixed(2),
      ]);
    });

    return {
      fileName: `sales-report-${dayjs().format('YYYYMMDD-HHmm')}.csv`,
      contentType: 'text/csv',
      content: toCsv(rows),
    };
  }

  const overview = await getAnalyticsOverview();
  const rows = [['Metric', 'Value']];

  rows.push(['Revenue', overview.profitAndLoss.revenue]);
  rows.push(['Costs', overview.profitAndLoss.costs]);
  rows.push(['Profit', overview.profitAndLoss.profit]);
  rows.push(['Inventory Turnover Ratio', overview.inventoryTurnover.turnoverRatio]);
  rows.push(['Total Customers', overview.customerAnalytics.totalCustomers]);
  rows.push(['Active Customers', overview.customerAnalytics.activeCustomers]);

  return {
    fileName: `analytics-summary-${dayjs().format('YYYYMMDD-HHmm')}.csv`,
    contentType: 'text/csv',
    content: toCsv(rows),
  };
}

module.exports = {
  getAnalyticsOverview,
  exportAnalyticsReport,
};
