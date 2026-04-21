const SALE_QUEUE_KEY = 'meg_offline_sale_queue'
const DB_NAME = 'meg-offline-db'
const STORE_NAME = 'saleQueue'

function parseQueue(raw) {
  if (!raw) {
    return []
  }

  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function canUseIndexedDb() {
  return typeof indexedDB !== 'undefined'
}

function openDb() {
  if (!canUseIndexedDb()) {
    return Promise.resolve(null)
  }

  return new Promise((resolve) => {
    const request = indexedDB.open(DB_NAME, 1)

    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' })
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => resolve(null)
  })
}

async function listFromIndexedDb() {
  const db = await openDb()
  if (!db) {
    return null
  }

  return new Promise((resolve) => {
    const transaction = db.transaction(STORE_NAME, 'readonly')
    const store = transaction.objectStore(STORE_NAME)
    const request = store.getAll()

    request.onsuccess = () => resolve(request.result || [])
    request.onerror = () => resolve([])
  })
}

async function putToIndexedDb(entry) {
  const db = await openDb()
  if (!db) {
    return false
  }

  return new Promise((resolve) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite')
    const store = transaction.objectStore(STORE_NAME)
    const request = store.put(entry)
    request.onsuccess = () => resolve(true)
    request.onerror = () => resolve(false)
  })
}

async function removeFromIndexedDb(id) {
  const db = await openDb()
  if (!db) {
    return false
  }

  return new Promise((resolve) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite')
    const store = transaction.objectStore(STORE_NAME)
    const request = store.delete(id)
    request.onsuccess = () => resolve(true)
    request.onerror = () => resolve(false)
  })
}

function listFromStorageFallback() {
  return parseQueue(localStorage.getItem(SALE_QUEUE_KEY))
}

function saveToStorageFallback(queue) {
  localStorage.setItem(SALE_QUEUE_KEY, JSON.stringify(queue))
}

export async function getQueuedSales() {
  const indexed = await listFromIndexedDb()
  if (indexed) {
    return indexed.sort((left, right) => String(left.createdAt).localeCompare(String(right.createdAt)))
  }

  return listFromStorageFallback()
}

export async function enqueueSale(payload) {
  const entry = {
    id: `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    payload,
    createdAt: new Date().toISOString(),
  }

  const storedInIndexedDb = await putToIndexedDb(entry)
  if (!storedInIndexedDb) {
    const queue = listFromStorageFallback()
    queue.push(entry)
    saveToStorageFallback(queue)
  }

  return entry
}

export async function clearQueuedSale(id) {
  const removedFromIndexedDb = await removeFromIndexedDb(id)
  if (removedFromIndexedDb) {
    return
  }

  const queue = listFromStorageFallback().filter((entry) => entry.id !== id)
  saveToStorageFallback(queue)
}

let syncing = false

export async function syncQueuedSales(apiClient) {
  if (syncing) {
    return { synced: 0, failed: 0 }
  }

  syncing = true
  try {
    let synced = 0
    let failed = 0
    const queue = await getQueuedSales()

    for (const entry of queue) {
      try {
        await apiClient.post('/sales', entry.payload)
        await clearQueuedSale(entry.id)
        synced += 1
      } catch (error) {
        failed += 1

        if (error?.response) {
          await clearQueuedSale(entry.id)
        }
      }
    }

    return { synced, failed }
  } finally {
    syncing = false
  }
}
