function roundCurrency(value) {
  return Number(Number(value || 0).toFixed(2));
}

function calculateLineItem(product, quantity) {
  const price = roundCurrency(product.sp);
  const costPrice = roundCurrency(product.cp);
  const subtotal = roundCurrency(price * quantity);
  const profit = roundCurrency((price - costPrice) * quantity);

  return {
    product: product._id,
    name: product.name,
    category: product.category,
    sku: product.sku,
    quantity,
    price,
    costPrice,
    subtotal,
    profit,
    image: product.image?.url || '',
  };
}

function calculateSaleTotals(items, taxRate) {
  const subtotal = roundCurrency(
    items.reduce((sum, item) => sum + item.subtotal, 0),
  );
  const tax = roundCurrency(subtotal * (Number(taxRate) / 100));
  const total = roundCurrency(subtotal + tax);
  const profit = roundCurrency(items.reduce((sum, item) => sum + item.profit, 0));

  return {
    subtotal,
    tax,
    total,
    profit,
  };
}

function calculateDiscountAmount(subtotal, discountType, discountValue) {
  const safeSubtotal = roundCurrency(subtotal);
  const safeValue = Number(discountValue || 0);

  if (!safeValue || !discountType || discountType === 'none') {
    return 0;
  }

  if (discountType === 'flat') {
    return Math.min(safeSubtotal, roundCurrency(safeValue));
  }

  if (discountType === 'percent') {
    return Math.min(safeSubtotal, roundCurrency((safeSubtotal * safeValue) / 100));
  }

  return 0;
}

module.exports = {
  roundCurrency,
  calculateLineItem,
  calculateSaleTotals,
  calculateDiscountAmount,
};
