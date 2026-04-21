import { createContext, useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { io } from 'socket.io-client'

import { getStoredUser } from '@/lib/storage'

export const DataSyncContext = createContext({ connected: false })

function resolveSocketUrl() {
  const explicit = import.meta.env.VITE_WS_URL
  if (explicit) {
    return explicit
  }

  const apiUrl = import.meta.env.VITE_API_URL
  if (!apiUrl) {
    return 'http://localhost:5000'
  }

  return apiUrl.replace(/\/api\/?$/, '')
}

export function DataSyncProvider({ children }) {
  const queryClient = useQueryClient()
  const [connected, setConnected] = useState(false)
  const reconnectToastLock = useRef(false)

  useEffect(() => {
    const user = getStoredUser()
    if (!user?.id) {
      return undefined
    }

    const socket = io(resolveSocketUrl(), {
      transports: ['websocket', 'polling'],
      withCredentials: true,
    })

    const invalidateOperationalData = () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['pos-products'] })
      queryClient.invalidateQueries({ queryKey: ['sales'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      queryClient.invalidateQueries({ queryKey: ['analytics-overview'] })
    }

    socket.on('connect', () => {
      setConnected(true)
      socket.emit('notification:subscribe', { userId: user.id })
      reconnectToastLock.current = false
    })

    socket.on('disconnect', () => {
      setConnected(false)
    })

    socket.on('products:changed', () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['pos-products'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    })

    socket.on('inventory:updated', () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['pos-products'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    })

    socket.on('sales:changed', () => {
      invalidateOperationalData()
    })

    socket.on('dashboard:refresh', () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['analytics-overview'] })
    })

    socket.io.on('reconnect', () => {
      if (reconnectToastLock.current) {
        return
      }

      reconnectToastLock.current = true
      invalidateOperationalData()
    })

    return () => {
      socket.disconnect()
      setConnected(false)
    }
  }, [queryClient])

  return <DataSyncContext.Provider value={{ connected }}>{children}</DataSyncContext.Provider>
}
