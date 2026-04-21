const crypto = require('crypto');
const mongoose = require('mongoose');

function transform(doc, ret) {
  ret.id = ret._id.toString();
  delete ret._id;
  delete ret.__v;
  return ret;
}

const purchaseOrderItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    sku: {
      type: String,
      default: '',
      trim: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    unitCost: {
      type: Number,
      required: true,
      min: 0,
    },
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: false },
);

const purchaseOrderSchema = new mongoose.Schema(
  {
    poNumber: {
      type: String,
      default: () => `PO-${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
      unique: true,
      index: true,
    },
    supplier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Supplier',
      required: true,
    },
    warehouse: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Warehouse',
      required: true,
    },
    items: {
      type: [purchaseOrderItemSchema],
      validate: {
        validator: (value) => Array.isArray(value) && value.length > 0,
        message: 'Purchase order requires at least one item',
      },
    },
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
    taxRate: {
      type: Number,
      default: 0,
      min: 0,
    },
    taxAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    total: {
      type: Number,
      required: true,
      min: 0,
    },
    amountPaid: {
      type: Number,
      default: 0,
      min: 0,
    },
    amountDue: {
      type: Number,
      default: 0,
      min: 0,
    },
    expectedDate: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: ['draft', 'ordered', 'received', 'cancelled'],
      default: 'draft',
      index: true,
    },
    notes: {
      type: String,
      default: '',
    },
    orderedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    receivedAt: {
      type: Date,
      default: null,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
    toJSON: { transform },
  },
);

module.exports = mongoose.model('PurchaseOrder', purchaseOrderSchema);
