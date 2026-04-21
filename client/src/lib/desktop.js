export function isDesktopRuntime() {
  return typeof window !== 'undefined' && Boolean(window.megDesktop)
}

export async function printInvoiceHtml(html) {
  if (!isDesktopRuntime()) {
    return { ok: false }
  }

  return window.megDesktop.printInvoiceHtml(html)
}

export async function writeDesktopCache(key, value) {
  if (!isDesktopRuntime()) {
    return { ok: false }
  }

  return window.megDesktop.cache.write(key, value)
}

export async function readDesktopCache(key) {
  if (!isDesktopRuntime()) {
    return { ok: false, value: null }
  }

  return window.megDesktop.cache.read(key)
}
