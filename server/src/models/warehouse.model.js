const mongoose = require('mongoose');
const crypto = require('crypto');

function transform(doc, ret) {
  ret.id = ret._id.toString();
  delete ret._id;
  delete ret.__v;
  return ret;
}

const warehouseSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      default: () => `WH-${crypto.randomBytes(3).toString('hex').toUpperCase()}`,
      unique: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    address: {
      type: String,
      default: '',
      trim: true,
    },
    contactPhone: {
      type: String,
      default: '',
      trim: true,
    },
    isDefault: {
      type: Boolean,
      default: false,
      index: true,
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

warehouseSchema.index({ isDefault: 1, active: 1 });

module.exports = mongoose.model('Warehouse', warehouseSchema);
