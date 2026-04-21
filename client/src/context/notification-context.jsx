import { createContext, useEffect, useMemo, useState } from 'react'
import { io } from 'socket.io-client'

import { api } from '@/lib/api'
import { getStoredUser } from '@/lib/storage'

export const NotificationContext = createContext(null)

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([])
  const [connected, setConnected] = useState(false)

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.read).length,
    [notifications],
  )

  useEffect(() => {
    let socket
    let mounted = true
    const user = getStoredUser()

    async function loadInitial() {
      try {
        const response = await api.get('/notifications?limit=30')
        if (!mounted) {
          return
        }

        setNotifications(response.data.notifications || [])
      } catch {
        if (mounted) {
          setNotifications([])
        }
      }
    }

    if (user?.id) {
      loadInitial()

      socket = io(import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000', {
        transports: ['websocket', 'polling'],
      })

      socket.on('connect', () => {
        setConnected(true)
        socket.emit('notification:subscribe', { userId: user.id })
      })

      socket.on('disconnect', () => {
        setConnected(false)
      })

      socket.on('notification:new', (payload) => {
        setNotifications((current) => [payload, ...current].slice(0, 50))
      })
    }

    return () => {
      mounted = false
      if (socket) {
        socket.disconnect()
      }
      setConnected(false)
    }
  }, [])

  async function markRead(notificationId) {
    await api.patch(`/notifications/${notificationId}/read`)
    setNotifications((current) =>
      current.map((notification) =>
        notification.id === notificationId ? { ...notification, read: true } : notification,
      ),
    )
  }

  async function markAllRead() {
    await api.patch('/notifications/read-all')
    setNotifications((current) => current.map((notification) => ({ ...notification, read: true })))
  }

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        connected,
        markRead,
        markAllRead,
      }}
    >
      {children}
    </NotificationContext.Provider>
  )
}
