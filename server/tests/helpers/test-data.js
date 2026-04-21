const User = require('../../src/models/user.model');
const { ROLES } = require('../../src/constants/roles');
const { signToken } = require('../../src/utils/token');

async function createUser(overrides = {}) {
  const user = await User.create({
    name: 'Test Admin',
    email: 'admin@test.com',
    password: 'secret123',
    role: ROLES.ADMIN,
    ...overrides,
  });

  return {
    user,
    token: signToken(user),
  };
}

module.exports = {
  createUser,
};
