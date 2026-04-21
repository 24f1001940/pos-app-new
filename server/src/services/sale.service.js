const Sale = require('../models/sale.model');
const Product = require('../models/product.model');
const {
  calculateLineItem,
  calculateSaleTotals,
  calculateDiscountAmount,
  roundCurrency,
} = require('../utils/calculations');
const { createHttpError } = require('../utils/http');
const { getOrCreateSettings } = require('./settings.service');
const {
  getOrCreateDefaultWarehouse,
  getStockRecord,
  adjustWarehouseStock,
} = require('./inventory.service');
const {
  upsertCustomerFromSale,
  recordCustomerSale,
  reverseCustomerSale,
  adjustCustomerCredit,
} = require('./customer.service');
const { createNotification } = require('./notification.service');
const { emitToAll } = require('./realtime.service');
const { sendEmail } = require('./email.service');
const logger = require('../config/logger');

function normalizeSaleItems(items) {
  if (!Array.isArray(items) || !items.length) {
    throw createHttpError(422, 'Invalid cart data');
  }

  return items.map((item) => {
    const quantity = Number(item.quantity ?? item.qty);

    if (!item?.productId || !Number.isInteger(quantity) || quantity <= 0) {
      throw createHttpError(422, 'Invalid cart data');
    }

    return {
      productId: String(item.productId),
      quantity,
      price: item.price,
    };
  });
}

function assertClientTotals(payload, totals) {
  const hasClientTotals =
    payload.subtotal !== undefined || payload.tax !== undefined || payload.total !== undefined;

  if (!hasClientTotals) {
    return;
  }

  const epsilon = 0.01;
  const subtotal = Number(payload.subtotal ?? totals.subtotal);
  const tax = Number(payload.tax ?? totals.tax);
  const total = Number(payload.total ?? totals.total);

  if (!Number.isFinite(subtotal) || !Number.isFinite(tax) || !Number.isFinite(total)) {
    throw createHttpError(422, 'Invalid cart data');
  }

  if (
    Math.abs(subtotal - totals.subtotal) > epsilon ||
    Math.abs(tax - totals.tax) > epsilon ||
    Math.abs(total - totals.total) > epsilon
  ) {
    throw createHttpError(422, 'Invalid cart data');
  }
}

function formatCurrency(value) {
  return `Rs ${Number(value || 0).toFixed(2)}`;
}

function buildInvoiceEmailHtml(sale) {
  const customerName = sale.customerName || sale.customer?.name || 'Customer';
  const lines = sale.items
    .map(
      (item) =>
        `<tr><td style="padding:8px 0;border-bottom:1px solid #e5e7eb">${item.name}</td><td style="padding:8px 0;border-bottom:1px solid #e5e7eb;text-align:center">${item.quantity}</td><td style="padding:8px 0;border-bottom:1px solid #e5e7eb;text-align:right">${formatCurrency(item.price)}</td><td style="padding:8px 0;border-bottom:1px solid #e5e7eb;text-align:right">${formatCurrency(item.subtotal)}</td></tr>`,
    )
    .join('');

  const taxLine = `GST (${Number(sale.taxRate || 0)}%)`;
  const footer = sale.receiptMeta?.receiptFooter || 'Thank you for shopping with us.';

  return `
    <div style="font-family:Arial,sans-serif;color:#111827;line-height:1.45;max-width:720px;margin:0 auto;padding:24px">
      <h2 style="margin:0 0 4px 0">${sale.receiptMeta?.shopName || 'Mujahid Electronic Goods'}</h2>
      <p style="margin:0 0 2px 0;color:#4b5563">Invoice: <strong>${sale.invoiceNumber}</strong></p>
      <p style="margin:0 0 16px 0;color:#4b5563">Date: ${new Date(sale.date).toLocaleString()}</p>
      <p style="margin:0 0 12px 0">Dear ${customerName}, your invoice is ready.</p>
      <table style="width:100%;border-collapse:collapse;font-size:14px">
        <thead>
          <tr>
            <th style="text-align:left;padding:8px 0;border-bottom:2px solid #d1d5db">Item</th>
            <th style="text-align:center;padding:8px 0;border-bottom:2px solid #d1d5db">Qty</th>
            <th style="text-align:right;padding:8px 0;border-bottom:2px solid #d1d5db">Price</th>
            <th style="text-align:right;padding:8px 0;border-bottom:2px solid #d1d5db">Amount</th>
          </tr>
        </thead>
        <tbody>${lines}</tbody>
      </table>
      <table style="margin-top:16px;width:320px;margin-left:auto;border-collapse:collapse;font-size:14px">
        <tr><td style="padding:4px 0;color:#4b5563">Subtotal</td><td style="padding:4px 0;text-align:right">${formatCurrency(sale.subtotal)}</td></tr>
        <tr><td style="padding:4px 0;color:#4b5563">Discount</td><td style="padding:4px 0;text-align:right">-${formatCurrency(sale.discountAmount)}</td></tr>
        <tr><td style="padding:4px 0;color:#4b5563">${taxLine}</td><td style="padding:4px 0;text-align:right">${formatCurrency(sale.tax)}</td></tr>
        <tr><td style="padding:8px 0;font-weight:700;border-top:1px solid #d1d5db">Total</td><td style="padding:8px 0;text-align:right;font-weight:700;border-top:1px solid #d1d5db">${formatCurrency(sale.total)}</td></tr>
        <tr><td style="padding:4px 0;color:#4b5563">Paid</td><td style="padding:4px 0;text-align:right">${formatCurrency(sale.amountPaid)}</td></tr>
        <tr><td style="padding:4px 0;color:#4b5563">Balance</td><td style="padding:4px 0;text-align:right">${formatCurrency(sale.balanceDue)}</td></tr>
      </table>
      <p style="margin-top:20px;color:#4b5563;font-size:13px">${footer}</p>
    </div>
  `;
}

function buildInvoiceEmailText(sale) {
  const customerName = sale.customerName || sale.customer?.name || 'Customer';
  const itemRows = sale.items
    .map((item) => `- ${item.name} x${item.quantity} = ${formatCurrency(item.subtotal)}`)
    .join('\n');

  return [
    `Dear ${customerName},`,
    '',
    `Your invoice ${sale.invoiceNumber} has been generated.`,
    `Date: ${new Date(sale.date).toLocaleString()}`,
    '',
    itemRows,
    '',
    `Subtotal: ${formatCurrency(sale.subtotal)}`,
    `Discount: -${formatCurrency(sale.discountAmount)}`,
    `Tax: ${formatCurrency(sale.tax)}`,
    `Total: ${formatCurrency(sale.total)}`,
    `Paid: ${formatCurrency(sale.amountPaid)}`,
    `Balance: ${formatCurrency(sale.balanceDue)}`,
  ].join('\n');
}

async function sendSaleInvoiceEmail(saleId, overrideEmail) {
  const sale = await Sale.findById(saleId)
    .populate('customer', 'name email')
    .populate('createdBy', 'name email role')
    .populate('salesperson', 'name email role');

  if (!sale) {
    throw createHttpError(404, 'Sale not found');
  }

  const recipient = overrideEmail || sale.customerEmail || sale.customer?.email;
  if (!recipient) {
    throw createHttpError(400, 'Customer email is required to send invoice');
  }

  let sent = false;
  try {
    sent = await sendEmail({
      to: recipient,
      subject: `Invoice ${sale.invoiceNumber} from ${sale.receiptMeta?.shopName || 'Mujahid Electronic Goods'}`,
      text: buildInvoiceEmailText(sale),
      html: buildInvoiceEmailHtml(sale),
    });
  } catch (error) {
    logger.error(`Invoice email failed for ${sale.invoiceNumber}: ${error.message}`);
    throw createHttpError(400, 'Unable to send invoice email. Please verify SMTP settings and recipient email.');
  }

  if (!sent) {
    throw createHttpError(400, 'Email service is not configured. Please set SMTP environment variables.');
  }

  sale.customerEmail = recipient;
  sale.invoiceEmailedAt = new Date();
  await sale.save();

  return sale;
}

async function createSaleTransaction(payload, user) {
  const normalizedItems = normalizeSaleItems(payload.items);
  const settings = await getOrCreateSettings();
  const warehouse = payload.warehouseId
    ? { _id: payload.warehouseId }
    : await getOrCreateDefaultWarehouse();
  const customer = await upsertCustomerFromSale(payload);
  if (payload.customerId && !customer) {
    throw createHttpError(404, 'Customer not found');
  }
  const uniqueProductIds = [...new Set(normalizedItems.map((item) => item.productId))];
  const products = await Product.find({
    _id: {
      $in: uniqueProductIds,
    },
  });

  if (products.length !== uniqueProductIds.length) {
    throw createHttpError(404, 'One or more selected products no longer exist');
  }

  const productMap = new Map(products.map((product) => [String(product._id), product]));
  const saleItems = [];

  for (const item of normalizedItems) {
    const product = productMap.get(item.productId);
    if (!product) {
      throw createHttpError(404, `Product not found: ${item.productId}`);
    }

    const stockRecord = await getStockRecord(product._id, warehouse._id, true);

    if (stockRecord.quantity < item.quantity) {
      throw createHttpError(400, 'Insufficient stock');
    }

    saleItems.push(calculateLineItem(product, item.quantity));
  }

  const taxRate = Number(payload.taxRate ?? settings.taxRate);
  const totals = calculateSaleTotals(saleItems, taxRate);
  const discountAmount = calculateDiscountAmount(
    totals.subtotal,
    payload.discountType,
    payload.discountValue,
  );
  const discountedSubtotal = roundCurrency(Math.max(0, totals.subtotal - discountAmount));
  const taxableTotal = roundCurrency(discountedSubtotal + 0);
  const tax = roundCurrency(taxableTotal * (taxRate / 100));
  const total = roundCurrency(taxableTotal + tax);
  assertClientTotals(payload, {
    subtotal: totals.subtotal,
    tax,
    total,
  });
  const payments = Array.isArray(payload.payments)
    ? payload.payments
        .map((payment) => ({
          method: payment.method || payload.paymentMethod || 'cash',
          amount: roundCurrency(payment.amount),
          reference: payment.reference || '',
          paidAt: payment.paidAt ? new Date(payment.paidAt) : new Date(),
        }))
        .filter((payment) => payment.amount > 0)
    : [];
  const amountPaid = payments.length
    ? roundCurrency(payments.reduce((sum, payment) => sum + payment.amount, 0))
    : roundCurrency(payload.amountPaid ?? total);
  const balanceDue = Math.max(0, roundCurrency(total - amountPaid));
  const status = balanceDue > 0 ? 'partial' : 'completed';

  for (const item of normalizedItems) {
    const product = productMap.get(item.productId);
    await adjustWarehouseStock({
      productId: product._id,
      warehouseId: warehouse._id,
      quantityDelta: -item.quantity,
      movementType: 'sale',
      actor: user,
      referenceType: 'sale',
      referenceId: '',
      notes: 'POS sale stock deduction',
    });
  }

  const sale = await Sale.create({
    items: saleItems,
    subtotal: totals.subtotal,
    taxRate,
    tax,
    total,
    profit: totals.profit,
    paymentMethod: payload.paymentMethod || 'cash',
    discountType: payload.discountType || 'none',
    discountValue: Number(payload.discountValue || 0),
    discountAmount,
    amountPaid,
    balanceDue,
    status,
    payments,
    customerName: payload.customerName || '',
    customerPhone: payload.customerPhone || '',
    customerEmail: payload.customerEmail || customer?.email || '',
    customer: customer?._id || null,
    warehouse: warehouse._id,
    createdBy: user._id,
    salesperson: payload.salespersonId || user._id,
    notes: payload.notes || '',
    receiptMeta: {
      shopName: settings.shopName,
      address: settings.address,
      contactPhone: settings.contactPhone,
      contactEmail: settings.contactEmail,
      receiptFooter: settings.receiptFooter,
      taxRate: settings.taxRate,
    },
  });

  if (customer) {
    await recordCustomerSale(customer._id, sale);

    if (sale.balanceDue > 0) {
      await adjustCustomerCredit(customer._id, sale.balanceDue);
    }
  }

  await createNotification({
    type: 'sale-completed',
    level: sale.balanceDue > 0 ? 'warning' : 'success',
    title: sale.balanceDue > 0 ? 'Sale recorded with pending balance' : 'Sale completed',
    message: `${sale.invoiceNumber} recorded for ${sale.total.toFixed(2)}${sale.balanceDue > 0 ? ` with ${sale.balanceDue.toFixed(2)} due` : ''}.`,
    metadata: {
      saleId: sale._id,
      invoiceNumber: sale.invoiceNumber,
      total: sale.total,
      balanceDue: sale.balanceDue,
      customer: sale.customerName || '',
    },
  });

  const shouldSendInvoiceEmail = Boolean(sale.customerEmail || customer?.email);
  if (shouldSendInvoiceEmail) {
    try {
      await sendSaleInvoiceEmail(sale._id, payload.customerEmail);
    } catch (error) {
      logger.warn(`Invoice email skipped for ${sale.invoiceNumber}: ${error.message}`);
    }
  }

  emitToAll('sales:changed', {
    action: 'created',
    saleId: String(sale._id),
    invoiceNumber: sale.invoiceNumber,
    at: new Date().toISOString(),
  });
  emitToAll('dashboard:refresh', {
    reason: 'sale-created',
    at: new Date().toISOString(),
  });

  return sale.populate([
    { path: 'createdBy', select: 'name email role' },
    { path: 'customer', select: 'name email phone loyaltyPoints creditBalance' },
    { path: 'salesperson', select: 'name email role' },
  ]);
}

async function reverseSale(saleId) {
  const sale = await Sale.findById(saleId);
  if (!sale) {
    throw createHttpError(404, 'Sale not found');
  }

  const warehouse = sale.warehouse || (await getOrCreateDefaultWarehouse());

  for (const item of sale.items) {
    const product = await Product.findById(item.product);
    if (!product) {
      continue;
    }

    await adjustWarehouseStock({
      productId: product._id,
      warehouseId: warehouse._id,
      quantityDelta: item.quantity,
      movementType: 'sale_reversal',
      actor: sale.createdBy,
      referenceType: 'sale-delete',
      referenceId: String(sale._id),
      notes: 'Inventory restored after sale deletion',
    });
  }

  if (sale.customer) {
    await reverseCustomerSale(sale.customer, sale);
  }

  emitToAll('sales:changed', {
    action: 'deleted',
    saleId: String(sale._id),
    invoiceNumber: sale.invoiceNumber,
    at: new Date().toISOString(),
  });
  emitToAll('dashboard:refresh', {
    reason: 'sale-deleted',
    at: new Date().toISOString(),
  });

  await sale.deleteOne();
  return sale;
}

module.exports = {
  createSaleTransaction,
  reverseSale,
  sendSaleInvoiceEmail,
};
