const mongoose = require('mongoose');

const Customer = require('../models/customer.model');
const Sale = require('../models/sale.model');

async function findCustomers(query = '', { skip = 0, limit = 50 } = {}) {
  const filter = query
    ? {
        $or: [
          { name: { $regex: query, $options: 'i' } },
          { email: { $regex: query, $options: 'i' } },
          { phone: { $regex: query, $options: 'i' } },
        ],
      }
    : {};

  const [customers, total] = await Promise.all([
    Customer.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Customer.countDocuments(filter),
  ]);

  return { customers, total };
}

async function getCustomerProfile(customerId) {
  const customerObjectId = mongoose.Types.ObjectId.isValid(customerId)
    ? new mongoose.Types.ObjectId(customerId)
    : customerId;

  const [customer, sales, stats] = await Promise.all([
    Customer.findById(customerId),
    Sale.find({ customer: customerObjectId }).sort({ date: -1 }).limit(20).populate('createdBy', 'name email role'),
    Sale.aggregate([
      { $match: { customer: customerObjectId } },
      {
        $group: {
          _id: '$customer',
          totalSpent: { $sum: '$total' },
          totalPurchases: { $sum: 1 },
          lastPurchaseAt: { $max: '$date' },
        },
      },
    ]),
  ]);

  return {
    customer,
    sales,
    stats: stats[0] || {
      totalSpent: customer?.totalSpent || 0,
      totalPurchases: customer?.totalPurchases || 0,
      lastPurchaseAt: customer?.lastPurchaseAt || null,
    },
  };
}

async function upsertCustomerFromSale(payload = {}) {
  const customerId = payload.customerId || null;
  const name = String(payload.customerName || '').trim();
  const phone = String(payload.customerPhone || '').trim();
  const email = String(payload.customerEmail || '').trim().toLowerCase();

  if (customerId) {
    const customer = await Customer.findById(customerId);
    return customer;
  }

  if (!name && !phone && !email) {
    return null;
  }

  const lookupTerms = [
    phone ? { phone } : null,
    email ? { email } : null,
    name ? { name } : null,
  ].filter(Boolean);

  const existingCustomer = lookupTerms.length
    ? await Customer.findOne({ $or: lookupTerms })
    : null;

  if (existingCustomer) {
    return existingCustomer;
  }

  return Customer.create({
    name: name || phone || email || 'Walk-in Customer',
    phone,
    email,
  });
}

async function recordCustomerSale(customerId, sale) {
  if (!customerId || !sale) {
    return null;
  }

  const loyaltyPoints = Math.floor(Number(sale.total || 0) / 100);

  return Customer.findByIdAndUpdate(
    customerId,
    {
      $inc: {
        loyaltyPoints,
        totalSpent: Number(sale.total || 0),
        totalPurchases: 1,
      },
      $set: {
        lastPurchaseAt: sale.date || new Date(),
      },
    },
    { returnDocument: 'after' },
  );
}

async function reverseCustomerSale(customerId, sale) {
  if (!customerId || !sale) {
    return null;
  }

  const loyaltyPoints = Math.floor(Number(sale.total || 0) / 100);

  return Customer.findByIdAndUpdate(
    customerId,
    {
      $inc: {
        loyaltyPoints: -loyaltyPoints,
        totalSpent: -Number(sale.total || 0),
        totalPurchases: -1,
        creditBalance: -Number(sale.balanceDue || 0),
      },
    },
    { returnDocument: 'after' },
  );
}

async function adjustCustomerCredit(customerId, delta) {
  if (!customerId || !delta) {
    return null;
  }

  return Customer.findByIdAndUpdate(
    customerId,
    { $inc: { creditBalance: delta } },
    { returnDocument: 'after' },
  );
}

module.exports = {
  findCustomers,
  getCustomerProfile,
  upsertCustomerFromSale,
  recordCustomerSale,
  reverseCustomerSale,
  adjustCustomerCredit,
};
