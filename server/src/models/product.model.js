const crypto = require('crypto');
const mongoose = require('mongoose');

function transform(doc, ret) {
  ret.id = ret._id.toString();
  delete ret._id;
  delete ret.__v;
  return ret;
}

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      required: true,
      trim: true,
    },
    sku: {
      type: String,
      trim: true,
      default: '',
    },
    barcode: {
      type: String,
      trim: true,
      default: '',
    },
    tags: {
      type: [String],
      default: [],
    },
    supplier: {
      name: { type: String, default: '' },
      email: { type: String, default: '' },
      phone: { type: String, default: '' },
      referenceCode: { type: String, default: '' },
    },
    warrantyMonths: {
      type: Number,
      default: 0,
      min: 0,
    },
    expiryDate: {
      type: Date,
      default: null,
    },
    variants: {
      type: [
        {
          name: { type: String, default: '' },
          sku: { type: String, default: '' },
          barcode: { type: String, default: '' },
          attributes: {
            color: { type: String, default: '' },
            storage: { type: String, default: '' },
            size: { type: String, default: '' },
          },
          stock: { type: Number, default: 0, min: 0 },
          cp: { type: Number, default: 0, min: 0 },
          sp: { type: Number, default: 0, min: 0 },
        },
      ],
      default: [],
    },
    stock: {
      type: Number,
      required: true,
      min: 0,
    },
    lowStockLimit: {
      type: Number,
      required: true,
      min: 0,
      default: 5,
    },
    cp: {
      type: Number,
      required: true,
      min: 0,
    },
    sp: {
      type: Number,
      required: true,
      min: 0,
    },
    image: {
      url: {
        type: String,
        default: '',
      },
      publicId: {
        type: String,
        default: '',
      },
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

productSchema.virtual('profitPerUnit').get(function getProfitPerUnit() {
  return Number((this.sp - this.cp).toFixed(2));
});

productSchema.virtual('profitMargin').get(function getProfitMargin() {
  if (!this.sp) {
    return 0;
  }

  return Number((((this.sp - this.cp) / this.sp) * 100).toFixed(2));
});

productSchema.virtual('isLowStock').get(function getIsLowStock() {
  return this.stock <= this.lowStockLimit;
});

productSchema.index({ name: 'text', category: 'text', sku: 'text', barcode: 'text' });
productSchema.index({ category: 1, createdAt: -1 });
productSchema.index({ stock: 1, lowStockLimit: 1 });
productSchema.index({ sp: 1 });

function buildSku(name) {
  const slug = String(name || 'PRD')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 12) || 'PRD';

  return `${slug}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
}

function buildBarcode() {
  return `${Date.now()}${crypto.randomBytes(3).toString('hex').toUpperCase().replace(/[^0-9]/g, '7')}`.slice(0, 13);
}

productSchema.pre('validate', function ensureIdentifiers() {
  if (!this.sku) {
    this.sku = buildSku(this.name);
  }

  if (!this.barcode) {
    this.barcode = buildBarcode();
  }
});

module.exports = mongoose.model('Product', productSchema);
