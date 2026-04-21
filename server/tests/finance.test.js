const request = require('supertest');

const app = require('../src/app');
const Product = require('../src/models/product.model');
const PurchaseOrder = require('../src/models/purchase-order.model');
const Supplier = require('../src/models/supplier.model');
const Warehouse = require('../src/models/warehouse.model');
const { connect, clearDatabase, disconnect } = require('./helpers/memory-db');
const { createUser } = require('./helpers/test-data');

beforeAll(connect);
afterEach(clearDatabase);
afterAll(disconnect);

async function createBaseEntities() {
  const supplier = await Supplier.create({
    name: 'Zenith Traders',
    paymentTermsDays: 0,
  });

  const warehouse = await Warehouse.create({
    name: 'Main Warehouse',
    isDefault: true,
  });

  const product = await Product.create({
    name: 'Ceiling Fan',
    category: 'Appliances',
    stock: 30,
    lowStockLimit: 5,
    cp: 1000,
    sp: 1600,
  });

  return { supplier, warehouse, product };
}

function daysAgo(days) {
  const value = new Date();
  value.setDate(value.getDate() - days);
  return value;
}

function daysAhead(days) {
  const value = new Date();
  value.setDate(value.getDate() + days);
  return value;
}

describe('Finance API - Payables Aging', () => {
  test('returns aging buckets and sorted overdue orders', async () => {
    const { token, user } = await createUser();
    const { supplier, warehouse, product } = await createBaseEntities();

    await PurchaseOrder.create([
      {
        supplier: supplier._id,
        warehouse: warehouse._id,
        items: [
          {
            product: product._id,
            name: product.name,
            sku: product.sku,
            quantity: 2,
            unitCost: 900,
            subtotal: 1800,
          },
        ],
        subtotal: 1800,
        total: 1800,
        amountPaid: 0,
        amountDue: 1800,
        status: 'ordered',
        expectedDate: daysAgo(45),
        orderedAt: daysAgo(45),
        createdBy: user._id,
      },
      {
        supplier: supplier._id,
        warehouse: warehouse._id,
        items: [
          {
            product: product._id,
            name: product.name,
            sku: product.sku,
            quantity: 1,
            unitCost: 1200,
            subtotal: 1200,
          },
        ],
        subtotal: 1200,
        total: 1200,
        amountPaid: 0,
        amountDue: 1200,
        status: 'draft',
        expectedDate: daysAgo(10),
        orderedAt: daysAgo(10),
        createdBy: user._id,
      },
      {
        supplier: supplier._id,
        warehouse: warehouse._id,
        items: [
          {
            product: product._id,
            name: product.name,
            sku: product.sku,
            quantity: 1,
            unitCost: 600,
            subtotal: 600,
          },
        ],
        subtotal: 600,
        total: 600,
        amountPaid: 0,
        amountDue: 600,
        status: 'ordered',
        expectedDate: daysAhead(1),
        orderedAt: daysAgo(1),
        createdBy: user._id,
      },
      {
        supplier: supplier._id,
        warehouse: warehouse._id,
        items: [
          {
            product: product._id,
            name: product.name,
            sku: product.sku,
            quantity: 1,
            unitCost: 500,
            subtotal: 500,
          },
        ],
        subtotal: 500,
        total: 500,
        amountPaid: 500,
        amountDue: 0,
        status: 'received',
        expectedDate: daysAgo(2),
        orderedAt: daysAgo(2),
        createdBy: user._id,
      },
    ]);

    const response = await request(app)
      .get('/api/finance/payables-aging')
      .set('Authorization', `Bearer ${token}`);

    expect(response.statusCode).toBe(200);
    expect(response.body.orderCount).toBe(3);
    expect(response.body.totalDue).toBe(3600);
    expect(response.body.buckets.notDue.count).toBe(1);
    expect(response.body.buckets.days1To15.count).toBe(1);
    expect(response.body.buckets.days31Plus.count).toBe(1);

    expect(response.body.overdueOrders.length).toBe(2);
    expect(response.body.overdueOrders[0].daysLate).toBeGreaterThan(
      response.body.overdueOrders[1].daysLate,
    );
  });

  test('applies supplier and lookbackDays filters', async () => {
    const { token, user } = await createUser();
    const { warehouse, product } = await createBaseEntities();

    const supplierA = await Supplier.create({ name: 'A Supplier', paymentTermsDays: 0 });
    const supplierB = await Supplier.create({ name: 'B Supplier', paymentTermsDays: 0 });

    await PurchaseOrder.create([
      {
        supplier: supplierA._id,
        warehouse: warehouse._id,
        items: [
          {
            product: product._id,
            name: product.name,
            sku: product.sku,
            quantity: 1,
            unitCost: 100,
            subtotal: 100,
          },
        ],
        subtotal: 100,
        total: 100,
        amountPaid: 0,
        amountDue: 100,
        status: 'ordered',
        expectedDate: daysAgo(5),
        orderedAt: daysAgo(5),
        createdBy: user._id,
      },
      {
        supplier: supplierA._id,
        warehouse: warehouse._id,
        items: [
          {
            product: product._id,
            name: product.name,
            sku: product.sku,
            quantity: 1,
            unitCost: 100,
            subtotal: 100,
          },
        ],
        subtotal: 100,
        total: 100,
        amountPaid: 0,
        amountDue: 100,
        status: 'ordered',
        expectedDate: daysAgo(70),
        orderedAt: daysAgo(70),
        createdBy: user._id,
      },
      {
        supplier: supplierB._id,
        warehouse: warehouse._id,
        items: [
          {
            product: product._id,
            name: product.name,
            sku: product.sku,
            quantity: 1,
            unitCost: 100,
            subtotal: 100,
          },
        ],
        subtotal: 100,
        total: 100,
        amountPaid: 0,
        amountDue: 100,
        status: 'ordered',
        expectedDate: daysAgo(3),
        orderedAt: daysAgo(3),
        createdBy: user._id,
      },
    ]);

    const filteredResponse = await request(app)
      .get('/api/finance/payables-aging')
      .query({ supplierId: String(supplierA._id), lookbackDays: 30 })
      .set('Authorization', `Bearer ${token}`);

    expect(filteredResponse.statusCode).toBe(200);
    expect(filteredResponse.body.orderCount).toBe(1);
    expect(filteredResponse.body.orders[0].supplier.id).toBe(String(supplierA._id));
    expect(filteredResponse.body.totalDue).toBe(100);
  });

  test('returns reconciliation contract expected by procurement UI', async () => {
    const { token, user } = await createUser();
    const { supplier, warehouse, product } = await createBaseEntities();

    await PurchaseOrder.create({
      supplier: supplier._id,
      warehouse: warehouse._id,
      items: [
        {
          product: product._id,
          name: product.name,
          sku: product.sku,
          quantity: 2,
          unitCost: 700,
          subtotal: 1400,
        },
      ],
      subtotal: 1400,
      total: 1400,
      amountPaid: 200,
      amountDue: 1200,
      status: 'ordered',
      expectedDate: daysAgo(4),
      orderedAt: daysAgo(4),
      createdBy: user._id,
    });

    const response = await request(app)
      .get('/api/finance/payables-aging')
      .set('Authorization', `Bearer ${token}`);

    expect(response.statusCode).toBe(200);
    expect(response.body).toMatchObject({
      totalDue: expect.any(Number),
      orderCount: expect.any(Number),
      buckets: {
        notDue: {
          count: expect.any(Number),
          amount: expect.any(Number),
        },
        days1To15: {
          count: expect.any(Number),
          amount: expect.any(Number),
        },
        days16To30: {
          count: expect.any(Number),
          amount: expect.any(Number),
        },
        days31Plus: {
          count: expect.any(Number),
          amount: expect.any(Number),
        },
      },
      overdueOrders: expect.any(Array),
      orders: expect.any(Array),
    });

    expect(response.body.orders[0]).toMatchObject({
      id: expect.any(String),
      poNumber: expect.any(String),
      amountDue: expect.any(Number),
      daysLate: expect.any(Number),
      agingBucket: expect.stringMatching(/^(notDue|days1To15|days16To30|days31Plus)$/),
      supplier: {
        id: expect.any(String),
        name: expect.any(String),
      },
    });
  });
});
