const Product = require('../models/product.model');
const Warehouse = require('../models/warehouse.model');
const InventoryStock = require('../models/inventory-stock.model');
const StockMovement = require('../models/stock-movement.model');
const { createHttpError } = require('../utils/http');
const { createLowStockAlert } = require('./notification.service');
const { emitToAll } = require('./realtime.service');

async function getOrCreateDefaultWarehouse() {
  let warehouse = await Warehouse.findOne({ isDefault: true });

  if (!warehouse) {
    warehouse = await Warehouse.create({
      name: 'Main Warehouse',
      address: 'Primary store inventory location',
      isDefault: true,
    });
  }

  return warehouse;
}

async function listWarehouses() {
  return Warehouse.find().sort({ isDefault: -1, createdAt: 1 });
}

async function createWarehouse(payload) {
  const warehouseCount = await Warehouse.countDocuments();
  return Warehouse.create({
    ...payload,
    isDefault: Boolean(payload.isDefault) || warehouseCount === 0,
  });
}

async function getStockRecord(productId, warehouseId, createIfMissing = true) {
  let stockRecord = await InventoryStock.findOne({ product: productId, warehouse: warehouseId });

  if (!stockRecord && createIfMissing) {
    const product = await Product.findById(productId);
    const warehouse = await Warehouse.findById(warehouseId);
    const initialQuantity = warehouse?.isDefault ? Number(product?.stock || 0) : 0;

    stockRecord = await InventoryStock.create({
      product: productId,
      warehouse: warehouseId,
      quantity: initialQuantity,
      reservedQuantity: 0,
    });
  }

  return stockRecord;
}

async function syncProductStock(productId) {
  const aggregation = await InventoryStock.aggregate([
    { $match: { product: productId } },
    { $group: { _id: '$product', quantity: { $sum: '$quantity' } } },
  ]);

  const totalStock = aggregation[0]?.quantity || 0;
  await Product.findByIdAndUpdate(productId, { stock: totalStock }, { runValidators: false });
  return totalStock;
}

async function seedProductInventory(product, quantity, actor = null) {
  const warehouse = await getOrCreateDefaultWarehouse();
  const stockRecord = await getStockRecord(product._id, warehouse._id, true);
  const beforeQuantity = stockRecord.quantity;
  stockRecord.quantity = quantity;
  await stockRecord.save();
  await syncProductStock(product._id);

  await StockMovement.create({
    product: product._id,
    warehouse: warehouse._id,
    movementType: 'opening_balance',
    quantity,
    beforeQuantity,
    afterQuantity: quantity,
    actor: actor?._id || actor || null,
    referenceType: 'product',
    referenceId: String(product._id),
    notes: 'Initial stock allocation',
  });

  return stockRecord;
}

async function adjustWarehouseStock({
  productId,
  warehouseId,
  quantityDelta,
  movementType,
  actor,
  referenceType = '',
  referenceId = '',
  notes = '',
  metadata = {},
}) {
  const stockRecord = await getStockRecord(productId, warehouseId, true);
  const beforeQuantity = stockRecord.quantity;
  const afterQuantity = beforeQuantity + quantityDelta;

  if (afterQuantity < 0) {
    throw createHttpError(400, 'Insufficient stock in the selected warehouse');
  }

  stockRecord.quantity = afterQuantity;
  await stockRecord.save();
  const totalStock = await syncProductStock(productId);

  await StockMovement.create({
    product: productId,
    warehouse: warehouseId,
    movementType,
    quantity: quantityDelta,
    beforeQuantity,
    afterQuantity,
    actor: actor?._id || actor || null,
    referenceType,
    referenceId,
    notes,
    metadata,
  });

  const updatedProduct = await Product.findById(productId).lean();
  if (updatedProduct) {
    emitToAll('inventory:updated', {
      productId: String(updatedProduct._id),
      stock: updatedProduct.stock,
      warehouseId: String(warehouseId),
      quantity: afterQuantity,
      movementType,
    });

    if (updatedProduct.stock <= updatedProduct.lowStockLimit) {
      const warehouse = await Warehouse.findById(warehouseId).lean();
      await createLowStockAlert({
        product: updatedProduct,
        stock: updatedProduct.stock,
        warehouseName: warehouse?.name || '',
      });
    }
  }

  return { stockRecord, totalStock };
}

async function transferStock({ productId, fromWarehouseId, toWarehouseId, quantity, actor, notes = '' }) {
  if (fromWarehouseId === toWarehouseId) {
    throw createHttpError(400, 'Transfer warehouses must be different');
  }

  const fromStock = await getStockRecord(productId, fromWarehouseId, true);
  if (fromStock.quantity < quantity) {
    throw createHttpError(400, 'Not enough stock in the source warehouse');
  }

  const toStock = await getStockRecord(productId, toWarehouseId, true);

  const fromBefore = fromStock.quantity;
  const toBefore = toStock.quantity;

  fromStock.quantity -= quantity;
  toStock.quantity += quantity;

  await Promise.all([fromStock.save(), toStock.save()]);

  await StockMovement.create([
    {
      product: productId,
      warehouse: fromWarehouseId,
      fromWarehouse: fromWarehouseId,
      toWarehouse: toWarehouseId,
      movementType: 'transfer_out',
      quantity: -quantity,
      beforeQuantity: fromBefore,
      afterQuantity: fromStock.quantity,
      actor: actor?._id || actor || null,
      notes,
      metadata: { linkedTransfer: true },
    },
    {
      product: productId,
      warehouse: toWarehouseId,
      fromWarehouse: fromWarehouseId,
      toWarehouse: toWarehouseId,
      movementType: 'transfer_in',
      quantity,
      beforeQuantity: toBefore,
      afterQuantity: toStock.quantity,
      actor: actor?._id || actor || null,
      notes,
      metadata: { linkedTransfer: true },
    },
  ]);

  await syncProductStock(productId);

  const updatedProduct = await Product.findById(productId).lean();
  if (updatedProduct) {
    emitToAll('inventory:updated', {
      productId: String(updatedProduct._id),
      stock: updatedProduct.stock,
      fromWarehouseId: String(fromWarehouseId),
      toWarehouseId: String(toWarehouseId),
      quantity,
      movementType: 'transfer',
    });

    if (updatedProduct.stock <= updatedProduct.lowStockLimit) {
      const warehouse = await Warehouse.findById(toWarehouseId).lean();
      await createLowStockAlert({
        product: updatedProduct,
        stock: updatedProduct.stock,
        warehouseName: warehouse?.name || '',
      });
    }
  }

  return {
    fromStock,
    toStock,
  };
}

async function getStockMovements(productId, limit = 50) {
  return StockMovement.find({ product: productId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('warehouse', 'name code')
    .populate('actor', 'name email role');
}

async function getInventorySummary() {
  const [warehouses, products, totalValue] = await Promise.all([
    Warehouse.countDocuments(),
    Product.countDocuments(),
    InventoryStock.aggregate([
      {
        $lookup: {
          from: 'products',
          localField: 'product',
          foreignField: '_id',
          as: 'product',
        },
      },
      { $unwind: '$product' },
      {
        $group: {
          _id: null,
          value: {
            $sum: { $multiply: ['$quantity', '$product.cp'] },
          },
        },
      },
    ]),
  ]);

  return {
    warehouses,
    products,
    inventoryValue: totalValue[0]?.value || 0,
  };
}

module.exports = {
  getOrCreateDefaultWarehouse,
  listWarehouses,
  createWarehouse,
  getStockRecord,
  seedProductInventory,
  adjustWarehouseStock,
  transferStock,
  getStockMovements,
  getInventorySummary,
  syncProductStock,
};
