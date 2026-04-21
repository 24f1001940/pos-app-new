const mongoose = require('mongoose');

function transform(doc, ret) {
  ret.id = ret._id.toString();
  delete ret._id;
  delete ret.__v;
  return ret;
}

const posDraftOrderSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      default: '',
      trim: true,
    },
    items: {
      type: Array,
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
    paymentMethod: {
      type: String,
      default: 'cash',
    },
    taxRate: {
      type: Number,
      default: 0,
    },
    discountType: {
      type: String,
      default: 'none',
    },
    discountValue: {
      type: Number,
      default: 0,
    },
    notes: {
      type: String,
      default: '',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform,
    },
  },
);

module.exports = mongoose.model('PosDraftOrder', posDraftOrderSchema);