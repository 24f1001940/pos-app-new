const request = require('supertest');

const app = require('../src/app');
const { connect, clearDatabase, disconnect } = require('./helpers/memory-db');

beforeAll(connect);
afterEach(clearDatabase);
afterAll(disconnect);

describe('Auth API', () => {
  test('creates the first user as admin during bootstrap', async () => {
    const response = await request(app).post('/api/auth/register').send({
      name: 'Owner',
      email: 'owner@test.com',
      password: 'secret123',
      role: 'staff',
    });

    expect(response.statusCode).toBe(201);
    expect(response.body.user.role).toBe('admin');
    expect(response.body.token).toBeDefined();
  });

  test('logs in an existing user', async () => {
    await request(app).post('/api/auth/register').send({
      name: 'Owner',
      email: 'owner@test.com',
      password: 'secret123',
    });

    const response = await request(app).post('/api/auth/login').send({
      email: 'owner@test.com',
      password: 'secret123',
    });

    expect(response.statusCode).toBe(200);
    expect(response.body.token).toBeDefined();
    expect(response.body.user.email).toBe('owner@test.com');
  });
});
