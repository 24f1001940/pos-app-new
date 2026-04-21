const request = require('supertest');

const app = require('../src/app');
const Product = require('../src/models/product.model');
const { connect, clearDatabase, disconnect } = require('./helpers/memory-db');
const { createUser } = require('./helpers/test-data');

beforeAll(connect);
afterEach(clearDatabase);
afterAll(disconnect);

describe('Dashboard API', () => {
  test('returns category distribution grouped by category', async () => {
    const { token } = await createUser();

    await Product.create([
      {
        name: 'Galaxy S23',
        category: 'Smartphones',
        stock: 8,
        lowStockLimit: 2,
        cp: 70000,
        sp: 82000,
      },
      {
        name: 'iPhone 14',
        category: 'Smartphones',
        stock: 4,
        lowStockLimit: 2,
        cp: 120000,
        sp: 145000,
      },
      {
        name: 'Lenovo ThinkPad',
        category: 'Laptops',
        stock: 3,
        lowStockLimit: 1,
        cp: 98000,
        sp: 120000,
      },
    ]);

    const response = await request(app)
      .get('/api/dashboard')
      .set('Authorization', `Bearer ${token}`);

    expect(response.statusCode).toBe(200);
    expect(Array.isArray(response.body.charts.categoryDistribution)).toBe(true);

    const smartphones = response.body.charts.categoryDistribution.find(
      (item) => item.name === 'Smartphones',
    );
    const laptops = response.body.charts.categoryDistribution.find(
      (item) => item.name === 'Laptops',
    );

    expect(smartphones).toBeTruthy();
    expect(laptops).toBeTruthy();
    expect(smartphones.value).toBe(2);
    expect(laptops.value).toBe(1);
  });
});
