const Product = require('../models/product.model');
const Expense = require('../models/expense.model');
const PurchaseOrder = require('../models/purchase-order.model');
const Sale = require('../models/sale.model');
const Supplier = require('../models/supplier.model');
const { createHttpError } = require('../utils/http');
const { roundCurrency } = require('../utils/calculations');
const { adjustWarehouseStock } = require('./inventory.service');

async function getFinanceSummary() {
  const [expenses, sales, payableData, supplierCount] = await Promise.all([
    Expense.aggregate([
      {
        $group: {
          _id: null,
          amount: { $sum: '$amount' },
        },
      },
    ]),
    Sale.aggregate([
      {
        $group: {
          _id: null,
          revenue: { $sum: '$total' },
          profit: { $sum: '$profit' },
        },
      },
    ]),
    PurchaseOrder.aggregate([
      {
        $match: {
          status: { $in: ['draft', 'ordered'] },
          amountDue: { $gt: 0 },
        },
      },
      {
        $group: {
          _id: null,
          amountDue: { $sum: '$amountDue' },
        },
      },
    ]),
    Supplier.countDocuments({ active: true }),
  ]);

  const totalExpenses = Number(expenses[0]?.amount || 0);
  const totalRevenue = Number(sales[0]?.revenue || 0);
  const totalProfit = Number(sales[0]?.profit || 0);
  const payable = Number(payableData[0]?.amountDue || 0);

  return {
    suppliers: supplierCount,
    totals: {
      revenue: roundCurrency(totalRevenue),
      expenses: roundCurrency(totalExpenses),
      profit: roundCurrency(totalProfit - totalExpenses),
      supplierPayable: roundCurrency(payable),
    },
  };
}

async function listSuppliers(search = '') {
  const query = {};
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { phone: { $regex: search, $options: 'i' } },
    ];
  }

  return Supplier.find(query).sort({ createdAt: -1 });
}

async function listExpenses(filters = {}) {
  const query = {};

  if (filters.category) {
    query.category = filters.category;
  }

  if (filters.startDate || filters.endDate) {
    query.expenseDate = {};
    if (filters.startDate) {
      query.expenseDate.$gte = new Date(filters.startDate);
    }
    if (filters.endDate) {
      query.expenseDate.$lte = new Date(filters.endDate);
    }
  }

  return Expense.find(query)
    .sort({ expenseDate: -1 })
    .populate('createdBy', 'name email role');
}

async function listPurchaseOrders(status = '') {
  const query = {};
  if (status && status !== 'all') {
    query.status = status;
  }

  return PurchaseOrder.find(query)
    .sort({ orderedAt: -1 })
    .populate('supplier', 'name email phone paymentTermsDays')
    .populate('warehouse', 'name code')
    .populate('createdBy', 'name email role');
}

async function createPurchaseOrder(payload, user) {
  const supplier = await Supplier.findById(payload.supplierId);
  if (!supplier) {
    throw createHttpError(404, 'Supplier not found');
  }

  const items = [];
  let subtotal = 0;
  for (const item of payload.items) {
    const product = await Product.findById(item.productId);
    if (!product) {
      throw createHttpError(404, 'Product not found in purchase order items');
    }

    const quantity = Number(item.quantity || 0);
    const unitCost = Number(item.unitCost || 0);
    const lineSubtotal = roundCurrency(quantity * unitCost);

    items.push({
      product: product._id,
      name: product.name,
      sku: product.sku || '',
      quantity,
      unitCost,
      subtotal: lineSubtotal,
    });

    subtotal = roundCurrency(subtotal + lineSubtotal);
  }

  const taxRate = Number(payload.taxRate || 0);
  const taxAmount = roundCurrency((subtotal * taxRate) / 100);
  const total = roundCurrency(subtotal + taxAmount);
  const amountPaid = roundCurrency(Number(payload.amountPaid || 0));
  const amountDue = roundCurrency(Math.max(total - amountPaid, 0));

  return PurchaseOrder.create({
    supplier: supplier._id,
    warehouse: payload.warehouseId,
    items,
    subtotal,
    taxRate,
    taxAmount,
    total,
    amountPaid,
    amountDue,
    expectedDate: payload.expectedDate || null,
    status: payload.status || 'draft',
    notes: payload.notes || '',
    createdBy: user._id,
  });
}

async function updatePurchaseOrderStatus(orderId, nextStatus, user) {
  const order = await PurchaseOrder.findById(orderId).populate('supplier', 'name');
  if (!order) {
    throw createHttpError(404, 'Purchase order not found');
  }

  if (order.status === 'received' || order.status === 'cancelled') {
    throw createHttpError(400, 'Completed purchase orders cannot be modified');
  }

  if (nextStatus === 'received') {
    for (const item of order.items) {
      await adjustWarehouseStock({
        productId: item.product,
        warehouseId: order.warehouse,
        quantityDelta: Number(item.quantity || 0),
        movementType: 'purchase_receive',
        actor: user._id,
        referenceType: 'purchase-order',
        referenceId: String(order._id),
        notes: `Stock received from PO ${order.poNumber}`,
      });
    }

    order.receivedAt = new Date();
  }

  order.status = nextStatus;
  await order.save();
  return order;
}

function createAgingBucket() {
  return {
    count: 0,
    amount: 0,
  };
}

function resolveBucket(daysLate) {
  if (daysLate <= 0) {
    return 'notDue';
  }

  if (daysLate <= 15) {
    return 'days1To15';
  }

  if (daysLate <= 30) {
    return 'days16To30';
  }

  return 'days31Plus';
}

async function getPayablesAging(filters = {}) {
  const query = {
    status: { $in: ['draft', 'ordered'] },
    amountDue: { $gt: 0 },
  };

  if (filters.supplierId) {
    query.supplier = filters.supplierId;
  }

  if (filters.startDate || filters.endDate) {
    query.orderedAt = {};
    if (filters.startDate) {
      query.orderedAt.$gte = new Date(filters.startDate);
    }
    if (filters.endDate) {
      query.orderedAt.$lte = new Date(filters.endDate);
    }
  }

  if (filters.lookbackDays && Number(filters.lookbackDays) > 0) {
    const lookbackDate = new Date();
    lookbackDate.setDate(lookbackDate.getDate() - Number(filters.lookbackDays));
    query.orderedAt = {
      ...(query.orderedAt || {}),
      $gte: lookbackDate,
    };
  }

  const asOfDate = filters.asOfDate ? new Date(filters.asOfDate) : new Date();

  const orders = await PurchaseOrder.find(query)
    .sort({ orderedAt: -1 })
    .populate('supplier', 'name email phone paymentTermsDays');

  const buckets = {
    notDue: createAgingBucket(),
    days1To15: createAgingBucket(),
    days16To30: createAgingBucket(),
    days31Plus: createAgingBucket(),
  };

  let totalDue = 0;

  const enrichedOrders = orders.map((order) => {
    const supplierTerms = Number(order.supplier?.paymentTermsDays || 0);
    const referenceDate = order.expectedDate || order.orderedAt;
    const dueDate = new Date(referenceDate);
    dueDate.setDate(dueDate.getDate() + supplierTerms);

    const daysLate = Math.floor((asOfDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
    const bucket = resolveBucket(daysLate);
    const dueAmount = Number(order.amountDue || 0);

    buckets[bucket].count += 1;
    buckets[bucket].amount = roundCurrency(buckets[bucket].amount + dueAmount);
    totalDue = roundCurrency(totalDue + dueAmount);

    return {
      ...order.toJSON(),
      dueDate,
      daysLate,
      agingBucket: bucket,
    };
  });

  const overdueOrders = enrichedOrders
    .filter((order) => order.daysLate > 0)
    .sort((a, b) => b.daysLate - a.daysLate);

  return {
    asOfDate,
    totalDue,
    orderCount: enrichedOrders.length,
    buckets,
    orders: enrichedOrders,
    overdueOrders,
  };
}

module.exports = {
  getFinanceSummary,
  listSuppliers,
  listExpenses,
  listPurchaseOrders,
  createPurchaseOrder,
  updatePurchaseOrderStatus,
  getPayablesAging,
};
