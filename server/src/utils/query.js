function parseNumeric(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function sanitizeDocument(doc) {
  if (!doc) {
    return doc;
  }

  if (Array.isArray(doc)) {
    return doc.map((item) => sanitizeDocument(item));
  }

  if (typeof doc !== 'object') {
    return doc;
  }

  if (doc instanceof Date || doc._bsontype === 'ObjectId') {
    return doc;
  }

  const cleaned = { ...doc };
  delete cleaned.id;
  delete cleaned.__v;

  Object.keys(cleaned).forEach((key) => {
    cleaned[key] = sanitizeDocument(cleaned[key]);
  });

  return cleaned;
}

module.exports = {
  parseNumeric,
  sanitizeDocument,
};
