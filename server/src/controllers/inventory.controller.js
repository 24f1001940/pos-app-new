const asyncHandler = require('../utils/async-handler');
const { createHttpError } = require('../utils/http');
const {
  listWarehouses,
  createWarehouse,
  transferStock,
  getInventorySummary,
  getStockMovements,
} = require('../services/inventory.service');
const { logActivity } = require('../services/activity-log.service');

const getWarehouses = asyncHandler(async (req, res) => {
  const warehouses = await listWarehouses();
  res.json({ warehouses });
});

const createWarehouseController = asyncHandler(async (req, res) => {
  const warehouse = await createWarehouse(req.body);

  await logActivity({
    user: req.user,
    eventType: 'warehouse_created',
    category: 'inventory',
    message: `Created warehouse ${warehouse.name}`,
    metadata: { warehouseId: warehouse._id },
    req,
  });

  res.status(201).json(warehouse);
});

const createStockTransfer = asyncHandler(async (req, res) => {
  const result = await transferStock({
    productId: req.body.productId,
    fromWarehouseId: req.body.fromWarehouseId,
    toWarehouseId: req.body.toWarehouseId,
    quantity: Number(req.body.quantity),
    actor: req.user,
    notes: req.body.notes || '',
  });

  await logActivity({
    user: req.user,
    eventType: 'stock_transfer',
    category: 'inventory',
    message: 'Transferred stock between warehouses',
    metadata: req.body,
    req,
  });

  res.status(201).json(result);
});

const getSummary = asyncHandler(async (req, res) => {
  const summary = await getInventorySummary();
  res.json(summary);
});

const getProductMovements = asyncHandler(async (req, res) => {
  if (!req.params.productId) {
    throw createHttpError(400, 'Product id is required');
  }

  const movements = await getStockMovements(req.params.productId, Number(req.query.limit) || 50);
  res.json({ movements });
});

module.exports = {
  getWarehouses,
  createWarehouseController,
  createStockTransfer,
  getSummary,
  getProductMovements,
};
