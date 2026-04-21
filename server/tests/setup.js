process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret';

// mongodb-memory-server can take longer than the default 5s on first run.
jest.setTimeout(120000);
