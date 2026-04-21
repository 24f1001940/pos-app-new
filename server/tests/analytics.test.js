const request = require('supertest');

const app = require('../src/app');
const Customer = require('../src/models/customer.model');
const Product = require('../src/models/product.model');
const Sale = require('../src/models/sale.model');
const { connect, clearDatabase, disconnect } = require('./helpers/memory-db');
const { createUser } = require('./helpers/test-data');

beforeAll(connect);
afterEach(clearDatabase);
afterAll(disconnect);

describe('Analytics API', () => {
  let token;
  let user;

  beforeEach(async () => {
    const auth = await createUser();
    token = auth.token;
    user = auth.user;
  });

  test('returns paginated analytics lists when query parameters are provided', async () => {
    const [customerOne, customerTwo, customerThree] = await Customer.create([
      {
        name: 'Customer One',
        phone: '111-111',
        totalSpent: 3000,
        totalPurchases: 2,
        createdBy: user.id,
      },
      {
        name: 'Customer Two',
        phone: '222-222',
        totalSpent: 5000,
        totalPurchases: 3,
        createdBy: user.id,
      },
      {
        name: 'Customer Three',
        phone: '333-333',
        totalSpent: 9000,
        totalPurchases: 4,
        createdBy: user.id,
      },
    ]);

    const [productA, productB] = await Product.create([
      {
        name: 'Phone A',
        category: 'Phones',
        sku: 'PH-A-1',
        cp: 100,
        sp: 150,
        stock: 100,
        reorderLevel: 5,
        createdBy: user.id,
      },
      {
        name: 'Accessory B',
        category: 'Accessories',
        sku: 'AC-B-1',
        cp: 20,
        sp: 35,
        stock: 100,
        reorderLevel: 5,
        createdBy: user.id,
      },
    ]);

    await Sale.create([
      {
        invoiceNumber: 'INV-A-001',
        customer: customerOne.id,
        customerName: customerOne.name,
        customerEmail: 'one@example.com',
        customerPhone: customerOne.phone,
        items: [
          {
            product: productA.id,
            name: productA.name,
            category: productA.category,
            sku: productA.sku,
            quantity: 2,
            price: 150,
            costPrice: 100,
            subtotal: 300,
            profit: 100,
          },
          {
            product: productB.id,
            name: productB.name,
            category: productB.category,
            sku: productB.sku,
            quantity: 1,
            price: 35,
            costPrice: 20,
            subtotal: 35,
            profit: 15,
          },
        ],
        subtotal: 335,
        taxRate: 0,
        tax: 0,
        total: 335,
        amountPaid: 335,
        balanceDue: 0,
        paymentMethod: 'cash',
        payments: [{ method: 'cash', amount: 335 }],
        profit: 115,
        createdBy: user.id,
      },
      {
        invoiceNumber: 'INV-A-002',
        customer: customerTwo.id,
        customerName: customerTwo.name,
        customerEmail: 'two@example.com',
        customerPhone: customerTwo.phone,
        items: [
          {
            product: productA.id,
            name: productA.name,
            category: productA.category,
            sku: productA.sku,
            quantity: 1,
            price: 150,
            costPrice: 100,
            subtotal: 150,
            profit: 50,
          },
        ],
        subtotal: 150,
        taxRate: 0,
        tax: 0,
        total: 150,
        amountPaid: 150,
        balanceDue: 0,
        paymentMethod: 'cash',
        payments: [{ method: 'cash', amount: 150 }],
        profit: 50,
        createdBy: user.id,
      },
    ]);

    const response = await request(app)
      .get('/api/analytics/overview')
      .query({
        bestSellingLimit: 1,
        categoryLimit: 1,
        topCustomersLimit: 2,
      })
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(Array.isArray(response.body.bestSelling)).toBe(true);
    expect(response.body.bestSelling).toHaveLength(1);
    expect(response.body.pagination.bestSelling.limit).toBe(1);
    expect(response.body.pagination.bestSelling.total).toBeGreaterThanOrEqual(2);

    expect(Array.isArray(response.body.categoryRevenue)).toBe(true);
    expect(response.body.categoryRevenue).toHaveLength(1);
    expect(response.body.pagination.categoryRevenue.limit).toBe(1);

    expect(Array.isArray(response.body.customerAnalytics.topCustomers)).toBe(true);
    expect(response.body.customerAnalytics.topCustomers).toHaveLength(2);
    expect(response.body.pagination.topCustomers.limit).toBe(2);
    expect(response.body.pagination.topCustomers.total).toBeGreaterThanOrEqual(3);

    const topCustomerName = response.body.customerAnalytics.topCustomers[0]?.name;
    expect(topCustomerName).toBe('Customer Three');
    expect(response.body.customerAnalytics.totalCustomers).toBe(3);
    expect(response.body.pagination.worstPerforming.limit).toBe(10);
  });
});
