const crypto = require('crypto');
const mongoose = require('mongoose');

function transform(doc, ret) {
  ret.id = ret._id.toString();
  delete ret._id;
  delete ret.__v;
  return ret;
}

const saleItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      default: '',
    },
    sku: {
      type: String,
      default: '',
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    costPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
    profit: {
      type: Number,
      required: true,
    },
    image: {
      type: String,
      default: '',
    },
  },
  {
    _id: false,
  },
);

const saleSchema = new mongoose.Schema(
  {
    invoiceNumber: {
      type: String,
      default: () =>
        `MEG-${crypto.randomBytes(5).toString('hex').toUpperCase()}`,
      unique: true,
      index: true,
    },
    items: {
      type: [saleItemSchema],
      validate: {
        validator: (value) => Array.isArray(value) && value.length > 0,
        message: 'A sale must contain at least one item',
      },
    },
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
    taxRate: {
      type: Number,
      required: true,
      min: 0,
    },
    tax: {
      type: Number,
      required: true,
      min: 0,
    },
    total: {
      type: Number,
      required: true,
      min: 0,
    },
    profit: {
      type: Number,
      required: true,
    },
    paymentMethod: {
      type: String,
      default: 'cash',
    },
    discountType: {
      type: String,
      default: 'none',
    },
    discountValue: {
      type: Number,
      default: 0,
      min: 0,
    },
    discountAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    amountPaid: {
      type: Number,
      default: 0,
      min: 0,
    },
    balanceDue: {
      type: Number,
      default: 0,
      min: 0,
    },
    status: {
      type: String,
      default: 'completed',
    },
    payments: {
      type: [
        {
          method: { type: String, default: 'cash' },
          amount: { type: Number, default: 0, min: 0 },
          reference: { type: String, default: '' },
          paidAt: { type: Date, default: Date.now },
        },
      ],
      default: [],
    },
    customerName: {
      type: String,
      default: '',
    },
    customerPhone: {
      type: String,
      default: '',
    },
    customerEmail: {
      type: String,
      default: '',
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      default: null,
    },
    warehouse: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Warehouse',
      default: null,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    salesperson: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    notes: {
      type: String,
      default: '',
    },
    invoiceEmailedAt: {
      type: Date,
      default: null,
    },
    receiptMeta: {
      shopName: String,
      address: String,
      contactPhone: String,
      contactEmail: String,
      receiptFooter: String,
      taxRate: Number,
    },
    date: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform,
    },
  },
);

saleSchema.virtual('itemCount').get(function getItemCount() {
  return this.items.reduce((sum, item) => sum + item.quantity, 0);
});

saleSchema.index({ date: -1, status: 1, paymentMethod: 1 });
saleSchema.index({ customer: 1, date: -1 });
saleSchema.index({ createdBy: 1, date: -1 });

module.exports = mongoose.model('Sale', saleSchema);
