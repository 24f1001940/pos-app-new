import { createContext, useEffect, useState } from 'react'

import { api } from '@/lib/api'
import {
  clearStoredAuth,
  getStoredToken,
  getStoredUser,
  setStoredAuth,
} from '@/lib/storage'
import { getErrorMessage } from '@/lib/utils'

export const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(getStoredUser())
  const [token, setToken] = useState(getStoredToken())
  const [loading, setLoading] = useState(Boolean(getStoredToken()))

  useEffect(() => {
    if (!token) {
      setLoading(false)
      return
    }

    let isMounted = true

    api
      .get('/auth/me')
      .then((response) => {
        if (!isMounted) {
          return
        }

        setUser(response.data.user)
      })
      .catch(() => {
        if (!isMounted) {
          return
        }

        clearStoredAuth()
        setUser(null)
        setToken(null)
      })
      .finally(() => {
        if (isMounted) {
          setLoading(false)
        }
      })

    return () => {
      isMounted = false
    }
  }, [token])

  async function login(credentials) {
    const response = await api.post('/auth/login', credentials)
    setStoredAuth(response.data.token, response.data.user)
    setToken(response.data.token)
    setUser(response.data.user)
    return response.data.user
  }

  async function bootstrap(values) {
    const response = await api.post('/auth/register', values)
    if (response.data.token) {
      setStoredAuth(response.data.token, response.data.user)
      setToken(response.data.token)
    }

    setUser(response.data.user)
    return response.data.user
  }

  function logout() {
    clearStoredAuth()
    setToken(null)
    setUser(null)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        bootstrap,
        logout,
        isAuthenticated: Boolean(token),
        getErrorMessage,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
