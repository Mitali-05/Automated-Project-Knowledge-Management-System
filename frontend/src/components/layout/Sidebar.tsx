import { useCallback, useRef, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { Building2, ChevronDown, FolderGit2, HelpCircle, LayoutDashboard, LogOut, UserCog } from 'lucide-react'
import { cn } from '../../lib/cn'
import { useAuth } from '../../context/AuthContext'
import { useClickOutside } from '../../hooks/useClickOutside'
import { Logo } from './Logo'
import { OrgSwitcher } from './OrgSwitcher'

const mainLinks = [
  { name: 'Dashboard', path: '/app', icon: LayoutDashboard, end: true },
  { name: 'Projects', path: '/app/projects', icon: FolderGit2, end: false },
  { name: 'Organizations', path: '/app/organizations', icon: Building2, end: false },
]

const linkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200',
    isActive ? 'bg-primary-light-indigo/50 text-primary-indigo shadow-sm' : 'text-text-secondary hover:bg-surface-background hover:text-text-primary',
  )

const menuItem = 'flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-text-primary transition-colors hover:bg-surface-background'

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [profileOpen, setProfileOpen] = useState(false)
  const profileRef = useRef<HTMLDivElement>(null)
  const closeProfile = useCallback(() => setProfileOpen(false), [])
  useClickOutside(profileRef, profileOpen, closeProfile)

  const initial = (user?.name ?? 'U').trim().charAt(0).toUpperCase()
  const go = (path: string) => { setProfileOpen(false); onNavigate?.(); navigate(path) }

  return (
    <aside className="flex h-full w-64 flex-col border-r border-surface-border bg-surface-card">
      <div className="flex h-16 items-center border-b border-surface-border px-6"><Logo to="/app" /></div>

      <OrgSwitcher onNavigate={onNavigate} />

      <div className="flex flex-1 flex-col overflow-y-auto px-4 py-6">
        <nav className="space-y-1" aria-label="Main">
          {mainLinks.map((l) => (
            <NavLink key={l.name} to={l.path} end={l.end} className={linkClass} onClick={onNavigate}>
              <l.icon size={18} className="shrink-0" aria-hidden />{l.name}
            </NavLink>
          ))}
        </nav>
      </div>

      <div className="relative border-t border-surface-border p-4" ref={profileRef}>
        <button
          className="flex w-full items-center gap-3 rounded-lg p-2 transition-colors hover:bg-surface-background"
          onClick={() => setProfileOpen((o) => !o)}
          aria-haspopup="menu" aria-expanded={profileOpen}
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary-indigo to-primary-violet font-semibold text-white" aria-hidden>{initial}</span>
          <div className="min-w-0 flex-1 text-left">
            <p className="truncate text-sm font-semibold text-text-primary">{user?.name}</p>
            <p className="truncate text-xs text-text-secondary">{user?.email}</p>
          </div>
          <ChevronDown size={16} className={cn('text-text-muted transition-transform duration-200', profileOpen && 'rotate-180')} aria-hidden />
        </button>
        {profileOpen && (
          <div role="menu" className="absolute inset-x-4 bottom-full z-50 mb-2 overflow-hidden rounded-lg border border-surface-border bg-white p-1.5 shadow-xl">
            <button role="menuitem" className={menuItem} onClick={() => go('/app/settings')}><UserCog size={16} aria-hidden /> Profile &amp; settings</button>
            <button role="menuitem" className={menuItem} onClick={() => go('/app/help')}><HelpCircle size={16} aria-hidden /> Help</button>
            <div className="my-1 border-t border-surface-border" />
            <button
              role="menuitem"
              onClick={() => { logout(); navigate('/', { replace: true }) }}
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-red-600 transition-colors hover:bg-red-50"
            >
              <LogOut size={16} aria-hidden /> Log out
            </button>
          </div>
        )}
      </div>
    </aside>
  )
}
