const Expense = require('../models/expense.model');
const Supplier = require('../models/supplier.model');
const asyncHandler = require('../utils/async-handler');
const { createHttpError } = require('../utils/http');
const {
  createPurchaseOrder,
  getFinanceSummary,
  getPayablesAging,
  listExpenses,
  listPurchaseOrders,
  listSuppliers,
  updatePurchaseOrderStatus,
} = require('../services/finance.service');

const getSummary = asyncHandler(async (req, res) => {
  const summary = await getFinanceSummary();
  res.json(summary);
});

const getSuppliers = asyncHandler(async (req, res) => {
  const suppliers = await listSuppliers(req.query.search || '');
  res.json({ suppliers });
});

const createSupplier = asyncHandler(async (req, res) => {
  const supplier = await Supplier.create({
    name: req.body.name,
    email: req.body.email || '',
    phone: req.body.phone || '',
    address: req.body.address || '',
    paymentTermsDays: Number(req.body.paymentTermsDays || 30),
    openingBalance: Number(req.body.openingBalance || 0),
    notes: req.body.notes || '',
    active: req.body.active ?? true,
  });

  res.status(201).json(supplier);
});

const updateSupplier = asyncHandler(async (req, res) => {
  const supplier = await Supplier.findByIdAndUpdate(
    req.params.id,
    {
      name: req.body.name,
      email: req.body.email || '',
      phone: req.body.phone || '',
      address: req.body.address || '',
      paymentTermsDays: Number(req.body.paymentTermsDays || 30),
      openingBalance: Number(req.body.openingBalance || 0),
      notes: req.body.notes || '',
      active: req.body.active ?? true,
    },
    { returnDocument: 'after', runValidators: true },
  );

  if (!supplier) {
    throw createHttpError(404, 'Supplier not found');
  }

  res.json(supplier);
});

const getExpenses = asyncHandler(async (req, res) => {
  const expenses = await listExpenses({
    category: req.query.category,
    startDate: req.query.startDate,
    endDate: req.query.endDate,
  });
  res.json({ expenses });
});

const createExpense = asyncHandler(async (req, res) => {
  const expense = await Expense.create({
    title: req.body.title,
    category: req.body.category,
    amount: Number(req.body.amount || 0),
    paymentMethod: req.body.paymentMethod || 'cash',
    paidTo: req.body.paidTo || '',
    notes: req.body.notes || '',
    expenseDate: req.body.expenseDate || new Date(),
    createdBy: req.user._id,
  });

  res.status(201).json(expense);
});

const getPurchaseOrders = asyncHandler(async (req, res) => {
  const orders = await listPurchaseOrders(req.query.status || '');
  res.json({ orders });
});

const getPayablesAgingController = asyncHandler(async (req, res) => {
  const aging = await getPayablesAging({
    supplierId: req.query.supplierId,
    lookbackDays: req.query.lookbackDays,
    startDate: req.query.startDate,
    endDate: req.query.endDate,
    asOfDate: req.query.asOfDate,
  });

  res.json(aging);
});

const createPurchaseOrderController = asyncHandler(async (req, res) => {
  const order = await createPurchaseOrder(req.body, req.user);
  res.status(201).json(order);
});

const updatePurchaseOrderStatusController = asyncHandler(async (req, res) => {
  const order = await updatePurchaseOrderStatus(req.params.id, req.body.status, req.user);
  res.json(order);
});

module.exports = {
  getSummary,
  getSuppliers,
  createSupplier,
  updateSupplier,
  getExpenses,
  createExpense,
  getPurchaseOrders,
  getPayablesAgingController,
  createPurchaseOrderController,
  updatePurchaseOrderStatusController,
};
