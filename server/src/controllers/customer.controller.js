const Customer = require('../models/customer.model');
const Sale = require('../models/sale.model');
const asyncHandler = require('../utils/async-handler');
const { createHttpError } = require('../utils/http');
const { findCustomers, getCustomerProfile } = require('../services/customer.service');

const listCustomers = asyncHandler(async (req, res) => {
  const search = req.query.search || '';
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
  const skip = (page - 1) * limit;
  const { customers, total } = await findCustomers(search, { skip, limit });

  res.json({
    customers,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  });
});

const createCustomer = asyncHandler(async (req, res) => {
  const customer = await Customer.create({
    name: req.body.name,
    email: req.body.email || '',
    phone: req.body.phone || '',
    address: req.body.address || '',
    notes: req.body.notes || '',
    tags: req.body.tags || [],
    active: req.body.active ?? true,
  });

  res.status(201).json(customer);
});

const updateCustomer = asyncHandler(async (req, res) => {
  const customer = await Customer.findByIdAndUpdate(
    req.params.id,
    {
      name: req.body.name,
      email: req.body.email || '',
      phone: req.body.phone || '',
      address: req.body.address || '',
      notes: req.body.notes || '',
      tags: req.body.tags || [],
      active: req.body.active ?? true,
    },
    { returnDocument: 'after', runValidators: true },
  );

  if (!customer) {
    throw createHttpError(404, 'Customer not found');
  }

  res.json(customer);
});

const getCustomer = asyncHandler(async (req, res) => {
  const profile = await getCustomerProfile(req.params.id);
  if (!profile.customer) {
    throw createHttpError(404, 'Customer not found');
  }

  res.json(profile);
});

const getCustomerSales = asyncHandler(async (req, res) => {
  const customer = await Customer.findById(req.params.id);
  if (!customer) {
    throw createHttpError(404, 'Customer not found');
  }

  const sales = await Sale.find({ customer: req.params.id })
    .sort({ date: -1 })
    .populate('createdBy', 'name email role')
    .populate('salesperson', 'name email role');

  res.json({ sales, customer });
});

module.exports = {
  listCustomers,
  createCustomer,
  updateCustomer,
  getCustomer,
  getCustomerSales,
};
