const Product = require('../models/product.model');
const Sale = require('../models/sale.model');
const Settings = require('../models/settings.model');
const Warehouse = require('../models/warehouse.model');
const InventoryStock = require('../models/inventory-stock.model');
const { sanitizeDocument } = require('../utils/query');

async function exportBackupData() {
  const [products, sales, settings, warehouses, inventoryStocks] = await Promise.all([
    Product.find().lean(),
    Sale.find().lean(),
    Settings.findOne({ shopCode: 'default' }).lean(),
    Warehouse.find().lean(),
    InventoryStock.find().lean(),
  ]);

  return {
    exportedAt: new Date().toISOString(),
    products,
    sales,
    settings,
    warehouses,
    inventoryStocks,
  };
}

async function restoreBackupData(backup) {
  await Product.deleteMany({});
  await Sale.deleteMany({});
  await Warehouse.deleteMany({});
  await InventoryStock.deleteMany({});

  const products = (backup.products || []).map((product) => sanitizeDocument(product));
  const sales = (backup.sales || []).map((sale) => sanitizeDocument(sale));
  const settings = backup.settings ? sanitizeDocument(backup.settings) : null;
  const warehouses = (backup.warehouses || []).map((warehouse) => sanitizeDocument(warehouse));
  const inventoryStocks = (backup.inventoryStocks || []).map((stock) => sanitizeDocument(stock));

  if (products.length) {
    await Product.insertMany(products);
  }

  if (sales.length) {
    await Sale.insertMany(sales);
  }

  if (settings) {
    delete settings._id;
    await Settings.findOneAndUpdate(
      { shopCode: 'default' },
      { ...settings, shopCode: 'default' },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true },
    );
  }

  if (warehouses.length) {
    await Warehouse.insertMany(warehouses);
  }

  if (inventoryStocks.length) {
    await InventoryStock.insertMany(inventoryStocks);
  }

  return {
    products: products.length,
    sales: sales.length,
  };
}

async function resetBusinessData() {
  await Promise.all([
    Product.deleteMany({}),
    Sale.deleteMany({}),
    Warehouse.deleteMany({}),
    InventoryStock.deleteMany({}),
  ]);
}

module.exports = {
  exportBackupData,
  restoreBackupData,
  resetBusinessData,
};
