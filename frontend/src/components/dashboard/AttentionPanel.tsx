import { AlertTriangle, CheckCircle2, Clock, GitBranch, History, XCircle } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { AttentionItem, AttentionKind } from '../../api/types'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card'

const meta: Record<AttentionKind, { icon: typeof XCircle; tone: string; label: string; tab: string }> = {
  SYNC_FAILED: { icon: XCircle, tone: 'bg-red-50 text-red-600', label: 'Sync failed', tab: '' },
  OUTDATED_KNOWLEDGE: { icon: History, tone: 'bg-red-50 text-red-600', label: 'Outdated', tab: '/knowledge' },
  STALE_KNOWLEDGE: { icon: Clock, tone: 'bg-amber-50 text-amber-600', label: 'Getting stale', tab: '/knowledge' },
  NEVER_SYNCED: { icon: AlertTriangle, tone: 'bg-amber-50 text-amber-600', label: 'Not synced yet', tab: '' },
  NO_REPOSITORIES: { icon: GitBranch, tone: 'bg-primary-light-indigo text-primary-indigo', label: 'No repository', tab: '/settings' },
}

export function AttentionPanel({ items }: { items: AttentionItem[] }) {
  return (
    <Card className="h-full">
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>Needs attention</CardTitle>
        {items.length > 0 && <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700">{items.length}</span>}
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <CheckCircle2 size={32} className="text-success" aria-hidden />
            <p className="text-sm font-medium text-text-primary">All clear</p>
            <p className="max-w-xs text-xs text-text-muted">No failed syncs and no outdated knowledge right now.</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {items.map((it, i) => {
              const m = meta[it.kind]
              return (
                <li key={`${it.kind}-${it.projectId}-${i}`}>
                  <Link to={`/app/projects/${it.projectId}${m.tab}`} className="flex items-start gap-3 rounded-lg p-2 transition-colors hover:bg-surface-background">
                    <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${m.tone}`}><m.icon size={16} aria-hidden /></span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-text-primary">{it.projectName} <span className="font-normal text-text-muted">· {m.label}</span></span>
                      <span className="block break-words text-xs text-text-secondary">{it.message}</span>
                    </span>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
