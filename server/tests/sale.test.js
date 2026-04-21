jest.mock('../src/services/email.service', () => ({
  sendEmail: jest.fn(async () => true),
}));

const request = require('supertest');

const app = require('../src/app');
const Product = require('../src/models/product.model');
const Sale = require('../src/models/sale.model');
const { sendEmail } = require('../src/services/email.service');
const { connect, clearDatabase, disconnect } = require('./helpers/memory-db');
const { createUser } = require('./helpers/test-data');

beforeAll(connect);
afterEach(clearDatabase);
afterAll(disconnect);

describe('Sales API', () => {
  beforeEach(() => {
    sendEmail.mockClear();
  });

  test('creates a sale and reduces stock', async () => {
    const { token } = await createUser();
    const product = await Product.create({
      name: 'Bluetooth Speaker',
      category: 'Audio',
      stock: 6,
      lowStockLimit: 2,
      cp: 900,
      sp: 1499,
    });

    const response = await request(app)
      .post('/api/sales')
      .set('Authorization', `Bearer ${token}`)
      .send({
        items: [{ productId: String(product._id), quantity: 2 }],
        taxRate: 18,
      });

    const updatedProduct = await Product.findById(product._id);
    const salesCount = await Sale.countDocuments();

    expect(response.statusCode).toBe(201);
    expect(response.body.total).toBe(3537.64);
    expect(updatedProduct.stock).toBe(4);
    expect(salesCount).toBe(1);
  });

  test('sends sale invoice email using dedicated endpoint', async () => {
    const { token } = await createUser();
    const product = await Product.create({
      name: 'Router AX3000',
      category: 'Networking',
      stock: 5,
      lowStockLimit: 1,
      cp: 4500,
      sp: 6500,
    });

    const saleResponse = await request(app)
      .post('/api/sales')
      .set('Authorization', `Bearer ${token}`)
      .send({
        items: [{ productId: String(product._id), quantity: 1 }],
        taxRate: 18,
        customerName: 'Ali Hassan',
        customerEmail: 'ali@example.com',
      });

    expect(saleResponse.statusCode).toBe(201);
    const createdSaleId = saleResponse.body.id;

    const emailResponse = await request(app)
      .post(`/api/sales/${createdSaleId}/email`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        email: 'ali@example.com',
      });

    expect(emailResponse.statusCode).toBe(200);
    expect(emailResponse.body.message).toContain('sent to ali@example.com');
    expect(emailResponse.body.sale.customerEmail).toBe('ali@example.com');
    expect(emailResponse.body.sale.invoiceEmailedAt).toBeTruthy();
    expect(sendEmail).toHaveBeenCalled();
  });

  test('returns 400 when trying to send invoice email without recipient', async () => {
    const { token } = await createUser();
    const product = await Product.create({
      name: 'USB Hub',
      category: 'Accessories',
      stock: 4,
      lowStockLimit: 1,
      cp: 600,
      sp: 1100,
    });

    const saleResponse = await request(app)
      .post('/api/sales')
      .set('Authorization', `Bearer ${token}`)
      .send({
        items: [{ productId: String(product._id), quantity: 1 }],
        taxRate: 18,
      });

    expect(saleResponse.statusCode).toBe(201);

    const emailResponse = await request(app)
      .post(`/api/sales/${saleResponse.body.id}/email`)
      .set('Authorization', `Bearer ${token}`)
      .send({});

    expect(emailResponse.statusCode).toBe(400);
    expect(emailResponse.body.message).toContain('Customer email is required');
  });

  test('accepts qty alias with subtotal tax total payload', async () => {
    const { token } = await createUser();
    const product = await Product.create({
      name: 'Gaming Mouse',
      category: 'Accessories',
      stock: 10,
      lowStockLimit: 2,
      cp: 900,
      sp: 1200,
    });

    const response = await request(app)
      .post('/api/sales')
      .set('Authorization', `Bearer ${token}`)
      .send({
        items: [{ productId: String(product._id), qty: 2, price: 1200 }],
        subtotal: 2400,
        tax: 432,
        total: 2832,
        taxRate: 18,
      });

    expect(response.statusCode).toBe(201);
    expect(response.body.total).toBe(2832);
  });

  test('returns invalid cart data for malformed checkout payload', async () => {
    const { token } = await createUser();

    const response = await request(app)
      .post('/api/sales')
      .set('Authorization', `Bearer ${token}`)
      .send({
        items: [{ productId: '', qty: 0 }],
      });

    expect(response.statusCode).toBe(422);
    expect(response.body.message).toBe('Invalid cart data');
  });

  test('returns insufficient stock when quantity exceeds available stock', async () => {
    const { token } = await createUser();
    const product = await Product.create({
      name: 'Portable SSD',
      category: 'Storage',
      stock: 1,
      lowStockLimit: 1,
      cp: 8000,
      sp: 10000,
    });

    const response = await request(app)
      .post('/api/sales')
      .set('Authorization', `Bearer ${token}`)
      .send({
        items: [{ productId: String(product._id), qty: 5 }],
        taxRate: 18,
      });

    expect(response.statusCode).toBe(400);
    expect(response.body.message).toBe('Insufficient stock');
  });

  test('returns paginated sales list with metadata', async () => {
    const { token } = await createUser();
    const product = await Product.create({
      name: 'Smart Watch',
      category: 'Wearables',
      stock: 10,
      lowStockLimit: 1,
      cp: 2000,
      sp: 3200,
    });

    await request(app)
      .post('/api/sales')
      .set('Authorization', `Bearer ${token}`)
      .send({
        items: [{ productId: String(product._id), qty: 1 }],
        taxRate: 18,
      });

    await request(app)
      .post('/api/sales')
      .set('Authorization', `Bearer ${token}`)
      .send({
        items: [{ productId: String(product._id), qty: 1 }],
        taxRate: 18,
      });

    const response = await request(app)
      .get('/api/sales?page=1&limit=1')
      .set('Authorization', `Bearer ${token}`);

    expect(response.statusCode).toBe(200);
    expect(response.body.pagination.page).toBe(1);
    expect(response.body.pagination.limit).toBe(1);
    expect(response.body.pagination.total).toBe(2);
    expect(response.body.sales).toHaveLength(1);
  });
});
