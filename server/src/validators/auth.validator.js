const { body } = require('express-validator');

const { ROLES } = require('../constants/roles');

const registerValidator = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').trim().normalizeEmail().isEmail().withMessage('Valid email is required'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
  body('role')
    .optional()
    .isIn(Object.values(ROLES))
    .withMessage('Role must be admin, manager, or staff'),
];

const loginValidator = [
  body('email').trim().normalizeEmail().isEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
];

module.exports = {
  registerValidator,
  loginValidator,
};
