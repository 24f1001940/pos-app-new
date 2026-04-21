const request = require('supertest');

const app = require('../src/app');
const Product = require('../src/models/product.model');
const { connect, clearDatabase, disconnect } = require('./helpers/memory-db');
const { createUser } = require('./helpers/test-data');

beforeAll(connect);
afterEach(clearDatabase);
afterAll(disconnect);

describe('Products API', () => {
  test('creates a product for an authenticated admin', async () => {
    const { token } = await createUser();
    const response = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Gaming Monitor',
        category: 'Displays',
        stock: 12,
        lowStockLimit: 4,
        cp: 12000,
        sp: 15999,
      });

    expect(response.statusCode).toBe(201);
    expect(response.body.name).toBe('Gaming Monitor');
    expect(response.body.isLowStock).toBe(false);
  });

  test('filters low stock items', async () => {
    const { token } = await createUser();
    await Product.create([
      {
        name: 'Wireless Mouse',
        category: 'Accessories',
        stock: 2,
        lowStockLimit: 5,
        cp: 400,
        sp: 899,
      },
      {
        name: 'Router',
        category: 'Networking',
        stock: 10,
        lowStockLimit: 2,
        cp: 1500,
        sp: 2499,
      },
    ]);

    const response = await request(app)
      .get('/api/products?stockStatus=low')
      .set('Authorization', `Bearer ${token}`);

    expect(response.statusCode).toBe(200);
    expect(response.body.products).toHaveLength(1);
    expect(response.body.products[0].name).toBe('Wireless Mouse');
  });

  test('returns paginated products with metadata', async () => {
    const { token } = await createUser();

    await Product.create([
      {
        name: 'Product A',
        category: 'Misc',
        stock: 5,
        lowStockLimit: 1,
        cp: 100,
        sp: 120,
      },
      {
        name: 'Product B',
        category: 'Misc',
        stock: 5,
        lowStockLimit: 1,
        cp: 100,
        sp: 120,
      },
      {
        name: 'Product C',
        category: 'Misc',
        stock: 5,
        lowStockLimit: 1,
        cp: 100,
        sp: 120,
      },
    ]);

    const response = await request(app)
      .get('/api/products?page=2&limit=2')
      .set('Authorization', `Bearer ${token}`);

    expect(response.statusCode).toBe(200);
    expect(response.body.pagination.page).toBe(2);
    expect(response.body.pagination.limit).toBe(2);
    expect(response.body.pagination.total).toBe(3);
    expect(response.body.products).toHaveLength(1);
  });
});
