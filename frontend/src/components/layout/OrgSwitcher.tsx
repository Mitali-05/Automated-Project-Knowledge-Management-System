import { useCallback, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, ChevronsUpDown, Plus, Settings2, User as UserIcon } from 'lucide-react'
import { cn } from '../../lib/cn'
import { useOrgs } from '../../context/OrgContext'
import { useClickOutside } from '../../hooks/useClickOutside'
import type { OrgSummary } from '../../api/types'

function OrgAvatar({ org, size = 'md' }: { org: OrgSummary; size?: 'sm' | 'md' }) {
  const box = size === 'md' ? 'h-9 w-9 text-sm' : 'h-7 w-7 text-xs'
  if (org.type === 'PERSONAL') {
    return <span className={cn('flex shrink-0 items-center justify-center rounded-lg bg-primary-light-indigo text-primary-indigo', box)} aria-hidden><UserIcon size={size === 'md' ? 16 : 14} /></span>
  }
  return <span className={cn('flex shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary-blue to-primary-violet font-bold text-white', box)} aria-hidden>{org.name.charAt(0).toUpperCase()}</span>
}

export function OrgSwitcher({ onNavigate }: { onNavigate?: () => void }) {
  const { orgs, activeOrg, setActiveOrgId, loading } = useOrgs()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const close = useCallback(() => setOpen(false), [])
  useClickOutside(ref, open, close)

  if (loading && !activeOrg) return <div className="mx-3 sm:mx-4 mt-4 h-12 animate-pulse rounded-xl bg-surface-background" role="status" aria-label="Loading workspaces" />
  if (!activeOrg) return null

  return (
    <div className="relative mx-3 sm:mx-4 mt-4" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox" aria-expanded={open}
        className="flex min-h-[44px] w-full items-center gap-3 rounded-xl border border-surface-border bg-surface-background/60 p-2 text-left transition-colors hover:border-primary-indigo/40 hover:bg-primary-light-indigo/30"
      >
        <OrgAvatar org={activeOrg} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-text-primary">{activeOrg.name}</span>
          <span className="block text-xs text-text-muted">{activeOrg.type === 'PERSONAL' ? 'Personal workspace' : `${activeOrg.role} · ${activeOrg.memberCount} member${activeOrg.memberCount === 1 ? '' : 's'}`}</span>
        </span>
        <ChevronsUpDown size={16} className="shrink-0 text-text-muted" aria-hidden />
      </button>

      {open && (
        <div className="absolute inset-x-0 top-full z-50 mt-2 overflow-hidden rounded-xl border border-surface-border bg-white p-1.5 shadow-xl">
          <p className="px-2 pb-1 pt-1.5 text-[11px] font-semibold uppercase tracking-wide text-text-muted">Switch workspace</p>
          <ul role="listbox" className="max-h-64 space-y-0.5 overflow-y-auto">
            {orgs.map((o) => (
              <li key={o.id} role="option" aria-selected={o.id === activeOrg.id}>
                <button
                  onClick={() => { setActiveOrgId(o.id); close() }}
                  className="flex w-full min-h-[38px] items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-primary-light-indigo/50"
                >
                  <OrgAvatar org={o} size="sm" />
                  <span className="min-w-0 flex-1 truncate text-sm text-text-primary">{o.name}</span>
                  {o.id === activeOrg.id && <Check size={15} className="shrink-0 text-primary-indigo" aria-hidden />}
                </button>
              </li>
            ))}
          </ul>
          <div className="mt-1.5 space-y-0.5 border-t border-surface-border pt-1.5">
            <Link to="/app/organizations?new=1" onClick={() => { close(); onNavigate?.() }} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-text-secondary transition-colors hover:bg-surface-background hover:text-text-primary">
              <Plus size={15} aria-hidden /> Create or join an organization
            </Link>
            <Link to={activeOrg.type === 'TEAM' ? `/app/organizations/${activeOrg.id}` : '/app/organizations'} onClick={() => { close(); onNavigate?.() }} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-text-secondary transition-colors hover:bg-surface-background hover:text-text-primary">
              <Settings2 size={15} aria-hidden /> Manage {activeOrg.type === 'TEAM' ? 'this organization' : 'organizations'}
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
