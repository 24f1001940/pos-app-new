const Product = require('../models/product.model');
const InventoryStock = require('../models/inventory-stock.model');
const StockMovement = require('../models/stock-movement.model');
const asyncHandler = require('../utils/async-handler');
const { createHttpError } = require('../utils/http');
const { parseNumeric } = require('../utils/query');
const {
  getOrCreateDefaultWarehouse,
  seedProductInventory,
  adjustWarehouseStock,
  getStockMovements,
  syncProductStock,
} = require('../services/inventory.service');
const { logActivity } = require('../services/activity-log.service');
const { emitToAll } = require('../services/realtime.service');

function normalizeProductPayload(body) {
  return {
    ...body,
    tags: Array.isArray(body.tags)
      ? body.tags.map((tag) => String(tag).trim()).filter(Boolean)
      : [],
    variants: Array.isArray(body.variants)
      ? body.variants.map((variant) => ({
          name: variant.name || '',
          sku: variant.sku || '',
          barcode: variant.barcode || '',
          attributes: {
            color: variant.attributes?.color || '',
            storage: variant.attributes?.storage || '',
            size: variant.attributes?.size || '',
          },
          stock: Number(variant.stock || 0),
          cp: Number(variant.cp || 0),
          sp: Number(variant.sp || 0),
        }))
      : [],
    supplier: {
      name: body.supplier?.name || '',
      email: body.supplier?.email || '',
      phone: body.supplier?.phone || '',
      referenceCode: body.supplier?.referenceCode || '',
    },
    warrantyMonths: Number(body.warrantyMonths || 0),
    expiryDate: body.expiryDate || null,
  };
}

const getProducts = asyncHandler(async (req, res) => {
  const { search, category, minPrice, maxPrice, stockStatus } = req.query;
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
  const skip = (page - 1) * limit;
  const query = {};

  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { category: { $regex: search, $options: 'i' } },
      { sku: { $regex: search, $options: 'i' } },
      { barcode: { $regex: search, $options: 'i' } },
    ];
  }

  if (category && category !== 'all') {
    query.category = category;
  }

  const min = parseNumeric(minPrice);
  const max = parseNumeric(maxPrice);
  if (min !== null || max !== null) {
    query.sp = {};
    if (min !== null) {
      query.sp.$gte = min;
    }
    if (max !== null) {
      query.sp.$lte = max;
    }
  }

  if (stockStatus === 'out') {
    query.stock = { $lte: 0 };
  } else if (stockStatus === 'in') {
    query.stock = { $gt: 0 };
  } else if (stockStatus === 'low') {
    query.$expr = { $lte: ['$stock', '$lowStockLimit'] };
  }

  const [products, totalProducts, categories] = await Promise.all([
    Product.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Product.countDocuments(query),
    Product.distinct('category'),
  ]);

  res.json({
    products,
    categories,
    pagination: {
      page,
      limit,
      total: totalProducts,
      totalPages: Math.max(1, Math.ceil(totalProducts / limit)),
    },
  });
});

const createProduct = asyncHandler(async (req, res) => {
  const productPayload = normalizeProductPayload(req.body);
  const product = await Product.create({
    ...productPayload,
    image: req.body.image || { url: '', publicId: '' },
    sku: productPayload.sku || undefined,
    barcode: productPayload.barcode || undefined,
  });

  await getOrCreateDefaultWarehouse();
  await seedProductInventory(product, Number(product.stock || 0), req.user);

  await logActivity({
    user: req.user,
    eventType: 'product_created',
    category: 'inventory',
    message: `Created product ${product.name}`,
    metadata: { productId: product._id },
    req,
  });

  emitToAll('products:changed', {
    action: 'created',
    productId: String(product._id),
    at: new Date().toISOString(),
  });

  res.status(201).json(product);
});

const updateProduct = asyncHandler(async (req, res) => {
  const existingProduct = await Product.findById(req.params.id);

  if (!existingProduct) {
    throw createHttpError(404, 'Product not found');
  }

  const productPayload = normalizeProductPayload(req.body);
  const incomingStock = Number.isFinite(Number(productPayload.stock))
    ? Number(productPayload.stock)
    : existingProduct.stock;
  const stockDelta = incomingStock - existingProduct.stock;

  const product = await Product.findByIdAndUpdate(
    req.params.id,
    {
      ...productPayload,
      stock: incomingStock,
      image: req.body.image || existingProduct.image,
    },
    {
      returnDocument: 'after',
      runValidators: true,
    },
  );

  if (!product) {
    throw createHttpError(404, 'Product not found');
  }

  if (stockDelta !== 0) {
    const defaultWarehouse = await getOrCreateDefaultWarehouse();
    await adjustWarehouseStock({
      productId: product._id,
      warehouseId: defaultWarehouse._id,
      quantityDelta: stockDelta,
      movementType: 'adjustment',
      actor: req.user,
      referenceType: 'product-update',
      referenceId: String(product._id),
      notes: 'Stock adjusted from product update',
    });
  } else {
    await syncProductStock(product._id);
  }

  await logActivity({
    user: req.user,
    eventType: 'product_updated',
    category: 'inventory',
    message: `Updated product ${product.name}`,
    metadata: { productId: product._id },
    req,
  });

  emitToAll('products:changed', {
    action: 'updated',
    productId: String(product._id),
    at: new Date().toISOString(),
  });

  res.json(product);
});

const deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) {
    throw createHttpError(404, 'Product not found');
  }

  await product.deleteOne();
  await InventoryStock.deleteMany({ product: product._id });
  await StockMovement.deleteMany({ product: product._id });

  await logActivity({
    user: req.user,
    eventType: 'product_deleted',
    category: 'inventory',
    message: `Deleted product ${product.name}`,
    metadata: { productId: product._id },
    req,
  });

  emitToAll('products:changed', {
    action: 'deleted',
    productId: String(product._id),
    at: new Date().toISOString(),
  });

  res.json({
    message: 'Product deleted successfully',
  });
});

const getProductHistory = asyncHandler(async (req, res) => {
  const exists = await Product.exists({ _id: req.params.id });
  if (!exists) {
    throw createHttpError(404, 'Product not found');
  }

  const movements = await getStockMovements(req.params.id, Number(req.query.limit) || 50);
  res.json({ movements });
});

module.exports = {
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  getProductHistory,
};
