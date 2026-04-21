const TOKEN_KEY = 'meg_token'
const USER_KEY = 'meg_user'
const THEME_KEY = 'meg_theme'
const THEME_SETTINGS_KEY = 'meg_theme_settings'

const defaultThemeSettings = {
  mode: 'system',
  accent: 'amber',
}

export const cacheKeys = {
  dashboard: 'meg_cache_dashboard',
  products: 'meg_cache_products',
  sales: 'meg_cache_sales',
  settings: 'meg_cache_settings',
  customers: 'meg_cache_customers',
  posDrafts: 'meg_cache_pos_drafts',
  suppliers: 'meg_cache_suppliers',
  expenses: 'meg_cache_expenses',
  purchaseOrders: 'meg_cache_purchase_orders',
  aiInsights: 'meg_cache_ai_insights',
}

export function getStoredToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function setStoredAuth(token, user) {
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}

export function clearStoredAuth() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}

export function getStoredUser() {
  const value = localStorage.getItem(USER_KEY)
  return value ? JSON.parse(value) : null
}

export function getStoredTheme() {
  return getStoredThemeSettings().mode
}

export function setStoredTheme(theme) {
  if (typeof theme === 'string') {
    setStoredThemeSettings({ mode: theme })
    return
  }

  setStoredThemeSettings(theme)
}

export function getStoredThemeSettings() {
  const rawSettings = localStorage.getItem(THEME_SETTINGS_KEY)

  if (rawSettings) {
    try {
      return {
        ...defaultThemeSettings,
        ...JSON.parse(rawSettings),
      }
    } catch {
      return defaultThemeSettings
    }
  }

  const legacyTheme = localStorage.getItem(THEME_KEY)

  if (legacyTheme) {
    return {
      ...defaultThemeSettings,
      mode: legacyTheme,
    }
  }

  return defaultThemeSettings
}

export function setStoredThemeSettings(settings) {
  const nextSettings = {
    ...defaultThemeSettings,
    ...settings,
  }

  localStorage.setItem(THEME_SETTINGS_KEY, JSON.stringify(nextSettings))
  localStorage.setItem(THEME_KEY, nextSettings.mode)
}

export function setCachedData(key, value) {
  localStorage.setItem(
    key,
    JSON.stringify({
      timestamp: Date.now(),
      value,
    }),
  )
}

export function getCachedData(key) {
  const raw = localStorage.getItem(key)
  if (!raw) {
    return null
  }

  try {
    return JSON.parse(raw)?.value ?? null
  } catch {
    return null
  }
}
