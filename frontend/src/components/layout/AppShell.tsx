import { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { NotificationProvider } from '../../context/NotificationContext'
import { Sidebar } from './Sidebar'
import { TopHeader } from './TopHeader'
import { useOrgs } from '../../context/OrgContext'
import { ErrorState, LoadingState } from '../ui/States'

export function AppShell() {
  const [menuOpen, setMenuOpen] = useState(false)
  const { pathname } = useLocation()
  const orgs = useOrgs()

  useEffect(() => setMenuOpen(false), [pathname])

  return (
    <NotificationProvider>
      <div className="flex h-screen overflow-hidden bg-surface-background">
        <div className="hidden md:block"><Sidebar /></div>
        {menuOpen && (
          <div className="fixed inset-0 z-50 flex md:hidden">
            <div className="h-full shadow-2xl"><Sidebar onNavigate={() => setMenuOpen(false)} /></div>
            <button className="flex-1 bg-black/40" aria-label="Close menu" onClick={() => setMenuOpen(false)} />
          </div>
        )}
        <div className="relative flex h-screen flex-1 flex-col overflow-hidden">
          <TopHeader onMenu={() => setMenuOpen(true)} />
          <main className="flex-1 overflow-y-auto">{orgs.error
            ? <div className="mx-auto max-w-3xl p-8"><ErrorState message={`Could not load workspaces: ${orgs.error}`} onRetry={() => { void orgs.refresh().catch(() => undefined) }} /></div>
            : orgs.loading && !orgs.activeOrg ? <div className="mx-auto max-w-5xl p-8"><LoadingState label="Loading your workspace..." /></div>
            : <Outlet />}</main>
        </div>
      </div>
    </NotificationProvider>
  )
}
