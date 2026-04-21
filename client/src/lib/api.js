import axios from 'axios'

import { getCachedData, getStoredToken, setCachedData } from './storage'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
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
