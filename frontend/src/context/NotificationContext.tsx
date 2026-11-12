import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { notificationApi } from '../api/endpoints'
import type { AppNotification } from '../api/types'
import { useAuth } from './AuthContext'

const POLL_MS = 30_000

interface NotificationContextValue {
  notifications: AppNotification[]
  unreadCount: number
  /** Loads the full list (called when the dropdown opens). */
  refresh: () => Promise<void>
  markAsRead: (id: number) => Promise<void>
  markAllAsRead: () => Promise<void>
}

const NotificationContext = createContext<NotificationContextValue | null>(null)

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)

  const refreshCount = useCallback(async () => {
    try {
      setUnreadCount((await notificationApi.unreadCount()).count)
    } catch {
      /* a failed poll is not worth interrupting the user */
    }
  }, [])

  const refresh = useCallback(async () => {
    try {
      const list = await notificationApi.list()
      setNotifications(list)
      setUnreadCount(list.filter((n) => !n.isRead).length)
    } catch {
      /* keep the previous list */
    }
  }, [])

  useEffect(() => {
    if (!user) return
    void refresh()
    const id = window.setInterval(() => void refreshCount(), POLL_MS)
    return () => window.clearInterval(id)
  }, [user, refresh, refreshCount])

  const markAsRead = useCallback(async (id: number) => {
    await notificationApi.markRead(id)
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)))
    setUnreadCount((c) => Math.max(0, c - 1))
  }, [])

  const markAllAsRead = useCallback(async () => {
    await notificationApi.markAllRead()
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
    setUnreadCount(0)
  }, [])

  const value = useMemo(
    () => ({ notifications, unreadCount, refresh, markAsRead, markAllAsRead }),
    [notifications, unreadCount, refresh, markAsRead, markAllAsRead],
  )
  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useNotifications(): NotificationContextValue {
  const ctx = useContext(NotificationContext)
  if (!ctx) throw new Error('useNotifications must be used inside NotificationProvider')
  return ctx
}
