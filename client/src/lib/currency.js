const DEFAULT_CURRENCY = import.meta.env.VITE_DEFAULT_CURRENCY || 'PKR'
const DEFAULT_LOCALE = import.meta.env.VITE_DEFAULT_LOCALE || 'en-PK'

export function formatCurrency(value, currency = DEFAULT_CURRENCY) {
  return new Intl.NumberFormat(DEFAULT_LOCALE, {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(value || 0)
}

export function formatNumber(value) {
  return new Intl.NumberFormat(DEFAULT_LOCALE).format(Number(value || 0))
}
