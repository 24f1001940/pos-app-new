const PosDraftOrder = require('../models/pos-draft-order.model');
const asyncHandler = require('../utils/async-handler');
const { createHttpError } = require('../utils/http');

const listDrafts = asyncHandler(async (req, res) => {
  const drafts = await PosDraftOrder.find({ createdBy: req.user._id })
    .sort({ updatedAt: -1 })
    .populate('createdBy', 'name email role');

  res.json({ drafts });
});

const createDraft = asyncHandler(async (req, res) => {
  const draft = await PosDraftOrder.create({
    ...req.body,
    createdBy: req.user._id,
  });

  res.status(201).json(draft);
});

const updateDraft = asyncHandler(async (req, res) => {
  const draft = await PosDraftOrder.findOneAndUpdate(
    { _id: req.params.id, createdBy: req.user._id },
    { ...req.body },
    { returnDocument: 'after', runValidators: true },
  );

  if (!draft) {
    throw createHttpError(404, 'Draft order not found');
  }

  res.json(draft);
});

const deleteDraft = asyncHandler(async (req, res) => {
  const draft = await PosDraftOrder.findOneAndDelete({ _id: req.params.id, createdBy: req.user._id });
  if (!draft) {
    throw createHttpError(404, 'Draft order not found');
  }

  res.json({ message: 'Draft order deleted successfully' });
});

module.exports = {
  listDrafts,
  createDraft,
  updateDraft,
  deleteDraft,
};
