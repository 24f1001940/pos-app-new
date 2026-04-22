import axios from 'axios'

import { getCachedData, getStoredToken, setCachedData } from './storage'

const localApiBaseUrl = 'http://localhost:5000/api'
const desktopApiBaseUrl = 'https://pos-app-new.onrender.com/api'

function resolveApiBaseUrl() {
  const configuredBaseUrl = import.meta.env.VITE_API_URL || localApiBaseUrl
  const isDesktopRuntime = typeof window !== 'undefined' && Boolean(window.megDesktop)

  if (isDesktopRuntime && configuredBaseUrl.includes('localhost')) {
    return import.meta.env.VITE_DESKTOP_API_URL || desktopApiBaseUrl
  }

  return configuredBaseUrl
}

export const api = axios.create({
  baseURL: resolveApiBaseUrl(),
})

api.interceptors.request.use((config) => {
  const token = getStoredToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})

export async function cachedGet(url, { params, cacheKey } = {}) {
  try {
    const response = await api.get(url, { params })
    if (cacheKey) {
      setCachedData(cacheKey, response.data)
    }

    return {
      ...response.data,
      _cached: false,
    }
  } catch (error) {
    if (cacheKey) {
      const fallback = getCachedData(cacheKey)
      if (fallback) {
        return {
          ...fallback,
          _cached: true,
        }
      }
    }

    throw error
  }
}
