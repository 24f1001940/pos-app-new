const express = require('express');

const {
  listDrafts,
  createDraft,
  updateDraft,
  deleteDraft,
} = require('../controllers/pos-draft.controller');
const { protect, authorize } = require('../middlewares/auth.middleware');
const { handleValidation } = require('../middlewares/validate.middleware');
const { posDraftValidator } = require('../validators/pos-draft.validator');
const { ROLES } = require('../constants/roles');

const router = express.Router();

router.use(protect);

router
  .route('/')
  .get(listDrafts)
  .post(authorize(ROLES.ADMIN, ROLES.MANAGER, ROLES.STAFF), posDraftValidator, handleValidation, createDraft);

router
  .route('/:id')
  .put(authorize(ROLES.ADMIN, ROLES.MANAGER, ROLES.STAFF), posDraftValidator, handleValidation, updateDraft)
  .delete(authorize(ROLES.ADMIN, ROLES.MANAGER, ROLES.STAFF), deleteDraft);

module.exports = router;
