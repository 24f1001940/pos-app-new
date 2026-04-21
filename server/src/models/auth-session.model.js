const mongoose = require('mongoose');
const crypto = require('crypto');

function transform(doc, ret) {
  ret.id = ret._id.toString();
  delete ret._id;
  delete ret.__v;
  delete ret.refreshTokenHash;
  return ret;
}

const authSessionSchema = new mongoose.Schema(
  {
    sessionId: {
      type: String,
      default: () => crypto.randomBytes(12).toString('hex'),
      unique: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    refreshTokenHash: {
      type: String,
      required: true,
    },
    userAgent: {
      type: String,
      default: '',
    },
    ipAddress: {
      type: String,
      default: '',
    },
    deviceLabel: {
      type: String,
      default: '',
    },
    tokenVersion: {
      type: Number,
      default: 0,
    },
    lastUsedAt: {
      type: Date,
      default: null,
    },
    revokedAt: {
      type: Date,
      default: null,
    },
    revokedReason: {
      type: String,
      default: '',
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform,
    },
  },
);

authSessionSchema.index({ user: 1, revokedAt: 1, expiresAt: 1 });

module.exports = mongoose.model('AuthSession', authSessionSchema);
