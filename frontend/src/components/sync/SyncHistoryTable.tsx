import type { SyncHistoryItem } from '../../api/types'
import { Badge } from '../ui/Badge'
import { formatDate } from '../../lib/format'

interface SyncHistoryTableProps {
  history: SyncHistoryItem[]
  loading?: boolean
}

export function SyncHistoryTable({ history, loading = false }: SyncHistoryTableProps) {
  if (loading && history.length === 0) {
    return (
      <div className="py-6 text-center text-xs text-text-muted">
        Loading synchronization history...
      </div>
    )
  }

  if (history.length === 0) {
    return (
      <div className="py-6 text-center text-xs text-text-muted">
        No synchronization runs recorded yet.
      </div>
    )
  }

  return (
    <div className="overflow-x-auto -mx-2 px-2 sm:mx-0 sm:px-0">
      <table className="w-full min-w-[540px] text-left text-xs">
        <thead>
          <tr className="border-b border-surface-border text-text-muted">
            <th className="pb-2.5 font-semibold">Repository</th>
            <th className="pb-2.5 font-semibold">Status</th>
            <th className="pb-2.5 font-semibold">Started</th>
            <th className="pb-2.5 font-semibold">Duration</th>
            <th className="pb-2.5 font-semibold">Items</th>
            <th className="pb-2.5 font-semibold">Result</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-surface-border/60">
          {history.map((run) => {
            const isCompleted = run.status === 'COMPLETED'
            const isFailed = run.status === 'FAILED'
            const isRunning = run.status === 'RUNNING' || run.status === 'PENDING'

            return (
              <tr key={run.id} className="hover:bg-surface-border/20 transition-colors">
                <td className="py-3 font-semibold text-text-primary">
                  {run.repositoryName || 'Repository'}
                </td>
                <td className="py-3">
                  <Badge variant={
                    isCompleted ? 'success' :
                    isFailed ? 'danger' :
                    isRunning ? 'primary' : 'default'
                  } className="text-[11px]">
                    {run.status}
                  </Badge>
                </td>
                <td className="py-3 text-text-secondary whitespace-nowrap">
                  {formatDate(run.startedAt)}
                </td>
                <td className="py-3 font-mono text-text-secondary whitespace-nowrap">
                  {run.durationSeconds !== null && run.durationSeconds !== undefined ? `${run.durationSeconds}s` : '—'}
                </td>
                <td className="py-3 font-semibold text-text-primary">
                  {run.itemsExtracted ?? 0}
                </td>
                <td className="py-3 text-text-muted max-w-xs truncate">
                  {isFailed && run.errorMessage ? (
                    <span className="text-red-700 font-mono text-[11px] truncate block" title={run.errorMessage}>
                      {run.errorMessage}
                    </span>
                  ) : (
                    <span className="truncate block">{run.statusMessage || 'Completed'}</span>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
