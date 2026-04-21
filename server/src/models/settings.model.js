const mongoose = require('mongoose');
const env = require('../config/env');

function transform(doc, ret) {
  ret.id = ret._id.toString();
  delete ret._id;
  delete ret.__v;
  return ret;
}

const settingsSchema = new mongoose.Schema(
  {
    shopCode: {
      type: String,
      default: 'default',
      unique: true,
    },
    shopName: {
      type: String,
      default: 'Mujahid Electronic Goods',
    },
    address: {
      type: String,
      default: 'Main Market, City Center',
    },
    contactPhone: {
      type: String,
      default: '+91 98765 43210',
    },
    contactEmail: {
      type: String,
      default: 'hello@mujahidelectronicgoods.com',
    },
    taxRate: {
      type: Number,
      default: env.defaultTaxRate,
      min: 0,
      max: 100,
    },
    currency: {
      type: String,
      default: env.defaultCurrency,
    },
    darkMode: {
      type: Boolean,
      default: false,
    },
    enableLowStockPopup: {
      type: Boolean,
      default: true,
    },
    enableEmailAlerts: {
      type: Boolean,
      default: false,
    },
    lowStockEmail: {
      type: String,
      default: '',
    },
    receiptFooter: {
      type: String,
      default: 'Thank you for shopping with Mujahid Electronic Goods.',
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform,
    },
  },
);

module.exports = mongoose.model('Settings', settingsSchema);
