const mongoose = require('mongoose');

function transform(doc, ret) {
  ret.id = ret._id.toString();
  delete ret._id;
  delete ret.__v;
  return ret;
}

const customerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      default: '',
      trim: true,
      lowercase: true,
    },
    phone: {
      type: String,
      default: '',
      trim: true,
      index: true,
    },
    address: {
      type: String,
      default: '',
      trim: true,
    },
    notes: {
      type: String,
      default: '',
    },
    tags: {
      type: [String],
      default: [],
    },
    loyaltyPoints: {
      type: Number,
      default: 0,
      min: 0,
    },
    creditBalance: {
      type: Number,
      default: 0,
    },
    totalSpent: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalPurchases: {
      type: Number,
      default: 0,
      min: 0,
    },
    lastPurchaseAt: {
      type: Date,
      default: null,
    },
    active: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform,
    },
  },
);

customerSchema.index({ name: 'text', email: 'text', phone: 'text' });
customerSchema.index({ active: 1, createdAt: -1 });
customerSchema.index({ totalSpent: -1 });

module.exports = mongoose.model('Customer', customerSchema);