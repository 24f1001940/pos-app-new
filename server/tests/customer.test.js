const request = require('supertest');

const app = require('../src/app');
const Customer = require('../src/models/customer.model');
const { connect, clearDatabase, disconnect } = require('./helpers/memory-db');
const { createUser } = require('./helpers/test-data');

beforeAll(connect);
afterEach(clearDatabase);
afterAll(disconnect);

describe('Customers API', () => {
  test('returns paginated customers with metadata', async () => {
    const { token } = await createUser();

    await Customer.create([
      { name: 'Ahsan', email: 'ahsan@test.com', phone: '123', active: true },
      { name: 'Bilal', email: 'bilal@test.com', phone: '124', active: true },
      { name: 'Cyan', email: 'cyan@test.com', phone: '125', active: true },
    ]);

    const response = await request(app)
      .get('/api/customers?page=2&limit=2')
      .set('Authorization', `Bearer ${token}`);

    expect(response.statusCode).toBe(200);
    expect(response.body.pagination.page).toBe(2);
    expect(response.body.pagination.limit).toBe(2);
    expect(response.body.pagination.total).toBe(3);
    expect(response.body.customers).toHaveLength(1);
  });
});
