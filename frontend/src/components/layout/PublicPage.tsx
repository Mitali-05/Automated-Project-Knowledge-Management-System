import type { ReactNode } from 'react'
import { PublicNavbar } from './PublicNavbar'

/** Shared frame for the marketing pages: navbar, decorative gradient, footer. */
export function PublicPage({ children, blobs = true }: { children: ReactNode; blobs?: boolean }) {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-surface-background text-text-primary selection:bg-primary-indigo selection:text-white">
      {blobs && (
        <>
          <div className="pointer-events-none absolute -left-[10%] -top-[20%] h-[50%] w-[50%] rounded-full bg-primary-indigo/15 blur-[120px]" />
          <div className="pointer-events-none absolute -bottom-[20%] -right-[10%] h-[50%] w-[50%] rounded-full bg-primary-blue/15 blur-[120px]" />
        </>
      )}
      <PublicNavbar />
      <main className="relative z-10 flex-1">{children}</main>
      <footer className="relative z-10 border-t border-surface-border bg-surface-card py-8 text-center text-sm text-text-muted">
        <p>&copy; 2026 PRISM - Automated Project Knowledge Management. A 7th-semester Honors Major Project.</p>
      </footer>
    </div>
  )
}
