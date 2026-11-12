import { Link, NavLink } from 'react-router-dom'
import { Menu, X } from 'lucide-react'
import { useState } from 'react'
import { cn } from '../../lib/cn'
import { useAuth } from '../../context/AuthContext'
import { Button } from '../ui/Button'
import { Logo } from './Logo'

const links = [
  { to: '/features', label: 'Features' },
  { to: '/how-it-works', label: 'How It Works' },
  { to: '/about', label: 'About' },
  { to: '/docs', label: 'Documentation' },
]

const linkClass = ({ isActive }: { isActive: boolean }) =>
  cn('transition-colors', isActive ? 'text-primary-indigo' : 'text-text-secondary hover:text-primary-indigo')

export function PublicNavbar() {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-surface-border bg-surface-card/80 backdrop-blur-md">
      <div className="container mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Logo />
        <div className="hidden items-center gap-8 text-sm font-medium md:flex">
          {links.map((l) => <NavLink key={l.to} to={l.to} className={linkClass}>{l.label}</NavLink>)}
        </div>
        <div className="flex items-center gap-4">
          {user ? (
            <Link to="/app"><Button>Open app</Button></Link>
          ) : (
            <>
              <Link to="/login" className="hidden text-sm font-medium text-text-secondary transition-colors hover:text-primary-indigo md:block">Login</Link>
              <Link to="/register"><Button>Get Started</Button></Link>
            </>
          )}
          <button className="text-text-secondary md:hidden" onClick={() => setOpen((o) => !o)} aria-label="Toggle menu" aria-expanded={open}>
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>
      {open && (
        <div className="flex flex-col gap-3 border-t border-surface-border px-4 py-4 text-sm font-medium md:hidden">
          {links.map((l) => <NavLink key={l.to} to={l.to} className={linkClass} onClick={() => setOpen(false)}>{l.label}</NavLink>)}
          {!user && <Link to="/login" onClick={() => setOpen(false)} className="text-text-secondary">Login</Link>}
        </div>
      )}
    </nav>
  )
}
