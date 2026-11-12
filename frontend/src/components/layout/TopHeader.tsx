import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Bell, Check, Menu, Search } from 'lucide-react'
import { cn } from '../../lib/cn'
import { useNotifications } from '../../context/NotificationContext'
import type { AppNotification } from '../../api/types'
import { timeAgo } from '../../lib/format'

const titles: [string, string][] = [
  ['/app/projects/new', 'New project'],
  ['/app/projects/', 'Project'],
  ['/app/projects', 'Projects'],
  ['/app/organizations', 'Organizations'],
  ['/app/settings', 'Settings'],
  ['/app/help', 'Help'],
]

function titleFor(pathname: string): string {
  return titles.find(([prefix]) => pathname.startsWith(prefix))?.[1] ?? 'Dashboard'
}

export function TopHeader({ onMenu }: { onMenu: () => void }) {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { notifications, unreadCount, refresh, markAsRead, markAllAsRead } = useNotifications()
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<AppNotification | null>(null)
  const [query, setQuery] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const toggle = () => {
    if (!open) void refresh()
    setOpen((o) => !o)
  }

  const openNotification = (n: AppNotification) => {
    setSelected(n)
    setOpen(false)
    if (!n.isRead) void markAsRead(n.id)
  }

  const search = (e: FormEvent) => {
    e.preventDefault()
    const q = query.trim()
    navigate(q ? `/app/projects?q=${encodeURIComponent(q)}` : '/app/projects')
  }

  return (
    <>
      <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center justify-between border-b border-surface-border bg-surface-card px-4 sm:px-6">
        <div className="flex items-center gap-4">
          <button className="text-text-secondary hover:text-text-primary md:hidden" onClick={onMenu} aria-label="Open menu"><Menu size={20} /></button>
          <div className="hidden items-center text-sm font-medium text-text-primary sm:flex">
            <span>PRISM Workspace</span><span className="mx-2 text-text-muted">/</span>
            <span className="text-text-secondary">{titleFor(pathname)}</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <form onSubmit={search} className="relative hidden sm:block" role="search">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" aria-hidden />
            <input
              type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search projects..."
              aria-label="Search projects"
              className="h-9 w-64 rounded-md border border-surface-border bg-surface-background pl-9 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary-indigo"
            />
          </form>

          <div className="relative" ref={dropdownRef}>
            <button
              onClick={toggle}
              className="relative rounded-full p-2 text-text-secondary transition-colors hover:bg-surface-background"
              aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`}
              aria-expanded={open}
            >
              <Bell size={20} />
              {unreadCount > 0 && (
                <span className="absolute right-1.5 top-1.5 flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary-indigo opacity-75" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-primary-indigo" />
                </span>
              )}
            </button>

            {open && (
              <div className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-lg border border-surface-border bg-surface-card shadow-lg">
                <div className="flex items-center justify-between border-b border-surface-border bg-surface-background px-4 py-3">
                  <h3 className="text-sm font-semibold text-text-primary">Notifications</h3>
                  {unreadCount > 0 && (
                    <button onClick={() => void markAllAsRead()} className="flex items-center gap-1 text-xs text-primary-indigo hover:text-primary-violet">
                      <Check size={12} aria-hidden /> Mark all read
                    </button>
                  )}
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="p-4 text-center text-sm text-text-secondary">No notifications</div>
                  ) : notifications.map((n) => (
                    <button
                      key={n.id} onClick={() => openNotification(n)}
                      className={cn('block w-full border-b border-surface-border p-4 text-left transition-colors hover:bg-surface-background/60', !n.isRead && 'bg-surface-background/40')}
                    >
                      <div className="mb-1 flex items-start justify-between gap-2">
                        <span className={cn('text-sm font-medium', n.isRead ? 'text-text-primary' : 'text-primary-indigo')}>{n.title}</span>
                        <span className="shrink-0 text-xs text-text-muted">{timeAgo(n.createdAt)}</span>
                      </div>
                      <p className="line-clamp-2 text-xs text-text-secondary">{n.description}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" onClick={() => setSelected(null)}>
          <div role="dialog" aria-modal="true" aria-label={selected.title} onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md overflow-hidden rounded-2xl border border-surface-border bg-surface-card p-6 shadow-xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <h3 className="text-lg font-bold text-text-primary">{selected.title}</h3>
              <span className="shrink-0 text-sm text-text-muted">{new Date(selected.createdAt).toLocaleString()}</span>
            </div>
            <p className="mb-6 whitespace-pre-wrap leading-relaxed text-text-secondary">{selected.description}</p>
            <button onClick={() => setSelected(null)} className="h-10 w-full rounded-lg bg-primary-indigo font-medium text-white transition-colors hover:bg-primary-violet">Close</button>
          </div>
        </div>
      )}
    </>
  )
}
