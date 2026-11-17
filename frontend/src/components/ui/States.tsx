import { AlertCircle, Inbox, LoaderCircle } from 'lucide-react'
import type { ReactNode } from 'react'
import { Button } from './Button'
import { Skeleton } from './Skeleton'

export function LoadingState({ rows = 3, label = 'Loading data...' }: { rows?: number; label?: string }) {
  return (
    <div className="grid gap-4 py-4" role="status" aria-live="polite" aria-busy="true">
      <div className="flex items-center gap-2 text-sm text-text-secondary"><LoaderCircle className="h-5 w-5 animate-spin motion-reduce:animate-none text-primary-indigo" aria-hidden />{label}</div>
      <div aria-hidden="true" className="grid gap-4">{Array.from({ length: rows }, (_, i) => <Skeleton key={i} className="h-24 w-full rounded-2xl" />)}</div>
    </div>
  )
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-3xl border border-surface-border bg-surface-card/60 px-4 py-14 text-center backdrop-blur-md" role="alert">
      <AlertCircle className="h-8 w-8 text-danger" aria-hidden />
      <p className="max-w-md text-sm text-text-secondary">{message}</p>
      {onRetry && <Button variant="outline" onClick={onRetry}>Try again</Button>}
    </div>
  )
}

export function EmptyState({ icon, title, description, action }: { icon?: ReactNode; title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-3xl border border-surface-border bg-surface-card/50 px-4 py-16 text-center backdrop-blur-md">
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-primary-indigo/10 text-primary-indigo">
        {icon ?? <Inbox size={32} aria-hidden />}
      </div>
      <h2 className="mb-2 text-xl font-bold text-text-primary">{title}</h2>
      {description && <p className="mb-6 max-w-md text-sm text-text-secondary">{description}</p>}
      {action}
    </div>
  )
}

export function Alert({ tone = 'error', children }: { tone?: 'error' | 'success' | 'info'; children: ReactNode }) {
  const styles = {
    error: 'border-red-100 bg-red-50 text-red-600',
    success: 'border-emerald-100 bg-emerald-50 text-emerald-700',
    info: 'border-primary-indigo/20 bg-primary-light-indigo text-primary-blue',
  }
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className={`flex items-center gap-2 rounded-lg border p-3 text-sm ${styles[tone]}`}>
      {tone === 'error' && <AlertCircle size={16} aria-hidden />}
      <span>{children}</span>
    </div>
  )
}
