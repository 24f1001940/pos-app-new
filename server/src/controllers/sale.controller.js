const Sale = require('../models/sale.model');
const asyncHandler = require('../utils/async-handler');
const { createSaleTransaction, reverseSale, sendSaleInvoiceEmail } = require('../services/sale.service');
const { parseNumeric } = require('../utils/query');

const getSales = asyncHandler(async (req, res) => {
  const { startDate, endDate, minAmount, maxAmount, customerId, status, paymentMethod } = req.query;
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
  const skip = (page - 1) * limit;
  const query = {};

  if (startDate || endDate) {
    query.date = {};
    if (startDate) {
      query.date.$gte = new Date(startDate);
    }
    if (endDate) {
      query.date.$lte = new Date(endDate);
    }
  }

  const min = parseNumeric(minAmount);
  const max = parseNumeric(maxAmount);
  if (min !== null || max !== null) {
    query.total = {};
    if (min !== null) {
      query.total.$gte = min;
    }
    if (max !== null) {
      query.total.$lte = max;
    }
  }

  if (customerId) {
    query.customer = customerId;
  }

  if (status) {
    query.status = status;
  }

  if (paymentMethod) {
    query.paymentMethod = paymentMethod;
  }

  const [sales, totalSales] = await Promise.all([
    Sale.find(query)
      .sort({ date: -1 })
      .skip(skip)
      .limit(limit)
      .populate('createdBy', 'name email role')
      .populate('customer', 'name email phone loyaltyPoints creditBalance')
      .populate('salesperson', 'name email role'),
    Sale.countDocuments(query),
  ]);

  res.json({
    sales,
    pagination: {
      page,
      limit,
      total: totalSales,
      totalPages: Math.max(1, Math.ceil(totalSales / limit)),
    },
  });
});

const createSale = asyncHandler(async (req, res) => {
  const sale = await createSaleTransaction(req.body, req.user);
  res.status(201).json(sale);
});

const deleteSale = asyncHandler(async (req, res) => {
  const sale = await reverseSale(req.params.id);
  res.json({
    message: `Sale ${sale.invoiceNumber} deleted and inventory restored`,
  });
});

const emailSaleInvoice = asyncHandler(async (req, res) => {
  const sale = await sendSaleInvoiceEmail(req.params.id, req.body?.email);
  res.json({
    message: `Invoice ${sale.invoiceNumber} sent to ${sale.customerEmail}`,
    sale,
  });
});

module.exports = {
  getSales,
  createSale,
  deleteSale,
  emailSaleInvoice,
};
