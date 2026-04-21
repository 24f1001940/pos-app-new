const mongoose = require('mongoose');

function transform(doc, ret) {
  ret.id = ret._id.toString();
  delete ret._id;
  delete ret.__v;
  return ret;
}

const supplierSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      index: true,
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
    paymentTermsDays: {
      type: Number,
      default: 30,
      min: 0,
    },
    openingBalance: {
      type: Number,
      default: 0,
    },
    notes: {
      type: String,
      default: '',
    },
    active: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    toJSON: { transform },
  },
);

supplierSchema.index({ name: 'text', email: 'text', phone: 'text' });

module.exports = mongoose.model('Supplier', supplierSchema);
