import * as Sentry from '@sentry/react'

let sentryEnabled = false

export function initSentry() {
  const dsn = import.meta.env.VITE_SENTRY_DSN
  if (!dsn) {
    return false
  }

  const tracesSampleRate = Number(import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE || 0)

  Sentry.init({
    dsn,
    environment: import.meta.env.VITE_NODE_ENV || 'development',
    tracesSampleRate: Number.isFinite(tracesSampleRate) ? tracesSampleRate : 0,
  })

  sentryEnabled = true
  return true
}

export async function startUiSpan(name, callback) {
  if (!sentryEnabled || typeof Sentry.startSpan !== 'function') {
    return callback()
  }

  return Sentry.startSpan(
    {
      name,
      op: 'ui.action',
    },
    callback,
  )
}

export function addUiBreadcrumb(message, category = 'ui.action', level = 'info') {
  if (!sentryEnabled) {
    return
  }

  Sentry.addBreadcrumb({
    message,
    category,
    level,
  })
}

export function captureUiException(error) {
  if (!sentryEnabled) {
    return
  }

  Sentry.captureException(error)
}

export { Sentry }
