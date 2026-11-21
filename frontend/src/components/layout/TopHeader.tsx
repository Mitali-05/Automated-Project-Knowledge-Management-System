import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Bell, Check, Menu, Search, X } from 'lucide-react'
import { cn } from '../../lib/cn'
import { useNotifications } from '../../context/NotificationContext'
import type { AppNotification } from '../../api/types'
import { timeAgo } from '../../lib/format'
import { Logo } from './Logo'

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
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false)
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
    setMobileSearchOpen(false)
    navigate(q ? `/app/projects?q=${encodeURIComponent(q)}` : '/app/projects')
  }

  return (
    <>
      <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center justify-between border-b border-surface-border bg-surface-card px-3 sm:px-6">
        <div className="flex items-center gap-2 sm:gap-4 min-w-0">
          <button
            className="flex h-10 w-10 items-center justify-center rounded-lg text-text-secondary hover:bg-surface-background hover:text-text-primary lg:hidden"
            onClick={onMenu}
            aria-label="Open navigation menu"
          >
            <Menu size={22} />
          </button>

          <div className="flex items-center sm:hidden">
            <Logo to="/app" />
          </div>

          <div className="hidden items-center text-sm font-medium text-text-primary sm:flex truncate">
            <span className="shrink-0">PRISM Workspace</span>
            <span className="mx-2 text-text-muted shrink-0">/</span>
            <span className="text-text-secondary truncate">{titleFor(pathname)}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          <form onSubmit={search} className="relative hidden md:block" role="search">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" aria-hidden />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search projects..."
              aria-label="Search projects"
              className="h-9 w-48 lg:w-64 rounded-xl border border-surface-border bg-surface-background pl-9 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary-indigo"
            />
          </form>

          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-full text-text-secondary hover:bg-surface-background md:hidden"
            onClick={() => setMobileSearchOpen((o) => !o)}
            aria-label="Toggle search"
          >
            <Search size={20} />
          </button>

          <div className="relative" ref={dropdownRef}>
            <button
              onClick={toggle}
              className="relative flex h-10 w-10 items-center justify-center rounded-full text-text-secondary transition-colors hover:bg-surface-background"
              aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`}
              aria-expanded={open}
            >
              <Bell size={20} />
              {unreadCount > 0 && (
                <span className="absolute right-2 top-2 flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary-indigo opacity-75" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-primary-indigo" />
                </span>
              )}
            </button>

            {open && (
              <div className="absolute right-0 z-50 mt-2 w-[calc(100vw-2rem)] max-w-sm rounded-2xl border border-surface-border bg-surface-card shadow-2xl">
                <div className="flex items-center justify-between border-b border-surface-border bg-surface-background/80 px-4 py-3 rounded-t-2xl">
                  <h3 className="text-sm font-semibold text-text-primary">Notifications</h3>
                  {unreadCount > 0 && (
                    <button
                      onClick={() => void markAllAsRead()}
                      className="flex items-center gap-1 text-xs font-semibold text-primary-indigo hover:text-primary-violet"
                    >
                      <Check size={12} aria-hidden /> Mark all read
                    </button>
                  )}
                </div>
                <div className="max-h-80 overflow-y-auto divide-y divide-surface-border/60">
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center text-sm text-text-secondary">No notifications</div>
                  ) : (
                    notifications.map((n) => (
                      <button
                        key={n.id}
                        onClick={() => openNotification(n)}
                        className={cn(
                          'block w-full p-4 text-left transition-colors hover:bg-surface-background/60',
                          !n.isRead && 'bg-surface-background/40'
                        )}
                      >
                        <div className="mb-1 flex items-start justify-between gap-2">
                          <span className={cn('text-sm font-medium', n.isRead ? 'text-text-primary' : 'text-primary-indigo')}>
                            {n.title}
                          </span>
                          <span className="shrink-0 text-xs text-text-muted">{timeAgo(n.createdAt)}</span>
                        </div>
                        <p className="line-clamp-2 text-xs text-text-secondary">{n.description}</p>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {mobileSearchOpen && (
        <div className="border-b border-surface-border bg-surface-card p-3 md:hidden">
          <form onSubmit={search} className="relative flex items-center gap-2" role="search">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" aria-hidden />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search projects..."
              autoFocus
              className="h-10 w-full rounded-xl border border-surface-border bg-surface-background pl-9 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary-indigo"
            />
            <button
              type="button"
              onClick={() => setMobileSearchOpen(false)}
              className="rounded-lg p-2 text-text-muted hover:bg-surface-background"
              aria-label="Close search"
            >
              <X size={18} />
            </button>
          </form>
        </div>
      )}

      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs"
          onClick={() => setSelected(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={selected.title}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md overflow-hidden rounded-2xl border border-surface-border bg-surface-card p-5 sm:p-6 shadow-2xl"
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <h3 className="text-lg font-bold text-text-primary">{selected.title}</h3>
              <span className="shrink-0 text-xs text-text-muted">{new Date(selected.createdAt).toLocaleString()}</span>
            </div>
            <p className="mb-6 whitespace-pre-wrap text-sm leading-relaxed text-text-secondary">{selected.description}</p>
            <button
              onClick={() => setSelected(null)}
              className="h-11 w-full rounded-xl bg-primary-indigo font-semibold text-white transition-colors hover:bg-primary-violet cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  )
}
