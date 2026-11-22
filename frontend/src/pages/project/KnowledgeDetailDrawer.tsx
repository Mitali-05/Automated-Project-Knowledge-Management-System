import { useState } from 'react'
import { motion } from 'framer-motion'
import { X, ExternalLink, GitCommit, AlertTriangle, ShieldCheck, CheckCircle2, RotateCw, FileCode, Clock } from 'lucide-react'
import { freshnessApi } from '../../api/endpoints'
import type { KnowledgeItem } from '../../api/types'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { useAsync } from '../../hooks/useAsync'
import { formatDate, safeUrl } from '../../lib/format'
import { freshnessTone } from '../../lib/tones'
import { cn } from '../../lib/cn'

interface KnowledgeDetailDrawerProps {
  item: KnowledgeItem
  projectId: number
  onClose: () => void
  onRevalidated?: () => void
}

export function KnowledgeDetailDrawer({ item, projectId, onClose, onRevalidated }: KnowledgeDetailDrawerProps) {
  const { data: freshness, reload: reloadFreshness } = useAsync(
    () => freshnessApi.detail(projectId, item.id),
    [projectId, item.id]
  )
  const [revalidating, setRevalidating] = useState(false)
  const [revalidateMsg, setRevalidateMsg] = useState<string | null>(null)

  const handleRevalidate = async () => {
    setRevalidating(true)
    setRevalidateMsg(null)
    try {
      await freshnessApi.revalidate(projectId, item.id)
      setRevalidateMsg('Knowledge item revalidated successfully.')
      reloadFreshness()
      onRevalidated?.()
    } catch (err: unknown) {
      setRevalidateMsg(err instanceof Error ? err.message : 'Revalidation failed')
    } finally {
      setRevalidating(false)
    }
  }

  const changeStatus = freshness?.changeStatus || item.changeFreshness || 'UNKNOWN'
  const isStale = changeStatus === 'POTENTIALLY_STALE' || changeStatus === 'OUTDATED'

  const changeTone = (status: string) => {
    switch (status) {
      case 'CURRENT': return 'bg-emerald-50 text-emerald-700 border-emerald-200'
      case 'POTENTIALLY_STALE': return 'bg-amber-50 text-amber-800 border-amber-200'
      case 'OUTDATED': return 'bg-red-50 text-red-700 border-red-200'
      default: return 'bg-slate-100 text-slate-700 border-slate-200'
    }
  }

  return (
    <motion.div
      key="overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs"
      onClick={onClose}
    >
      <motion.aside
        role="dialog"
        aria-modal="true"
        aria-label={item.title}
        initial={{ x: 40 }}
        animate={{ x: 0 }}
        exit={{ x: 40 }}
        transition={{ type: 'spring', stiffness: 320, damping: 32 }}
        className="h-full w-full max-w-full sm:max-w-xl md:max-w-2xl overflow-y-auto bg-surface-card p-4 sm:p-6 md:p-8 shadow-2xl space-y-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-surface-border pb-4">
          <div className="min-w-0 flex-1">
            <span className="text-xs font-bold uppercase tracking-wider text-text-muted">{item.type}</span>
            <h3 className="text-lg sm:text-xl font-bold text-text-primary mt-1 break-words">{item.title}</h3>
            {item.module && (
              <span className="mt-1.5 inline-block rounded-md bg-surface-border/60 px-2 py-0.5 text-xs font-semibold text-text-secondary">
                Module: {item.module}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl p-1.5 text-text-muted hover:bg-surface-background hover:text-text-primary cursor-pointer"
          >
            <X size={20} aria-hidden />
          </button>
        </div>

        <div className="rounded-2xl border border-surface-border bg-surface-background/60 p-3.5 sm:p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-text-muted">Freshness Status</span>
            <Button
              variant="outline"
              size="sm"
              isLoading={revalidating}
              onClick={handleRevalidate}
              className="h-7 text-xs"
            >
              <RotateCw size={12} aria-hidden />
              <span>Revalidate</span>
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className={cn('inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-bold', changeTone(changeStatus))}>
              {changeStatus === 'CURRENT' && <ShieldCheck size={14} />}
              {isStale && <AlertTriangle size={14} />}
              <span>Change Status: {changeStatus.replace('_', ' ')}</span>
            </div>

            <Badge variant={freshnessTone(item.freshness)}>
              Age: {item.freshness}
            </Badge>

            {item.confidence != null && (
              <Badge variant="outline">
                Confidence {Math.round(item.confidence * 100)}%
              </Badge>
            )}
          </div>

          {freshness?.reason && (
            <p className="text-xs text-text-secondary leading-relaxed bg-surface-card p-2.5 rounded-xl border border-surface-border/60 break-words">
              {freshness.reason}
            </p>
          )}

          {freshness?.changedFiles && freshness.changedFiles.length > 0 && (
            <div className="space-y-1.5 pt-1">
              <span className="text-[11px] font-semibold text-text-muted">Changed Files Detected:</span>
              <div className="flex flex-wrap gap-1.5">
                {freshness.changedFiles.map((f, idx) => (
                  <span key={idx} className="inline-flex items-center gap-1 rounded bg-amber-100/70 border border-amber-200 px-2 py-0.5 font-mono text-[11px] text-amber-900 break-all">
                    <FileCode size={11} className="shrink-0" />
                    <span>{f}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {revalidateMsg && (
            <p className="text-xs font-medium text-emerald-600 flex items-center gap-1">
              <CheckCircle2 size={13} />
              <span>{revalidateMsg}</span>
            </p>
          )}
        </div>

        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-text-muted mb-2">Summary</h4>
          <p className="text-sm text-text-secondary leading-relaxed bg-surface-card p-3 sm:p-3.5 rounded-xl border border-surface-border break-words">
            {item.summary}
          </p>
        </div>

        {item.details && (
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-text-muted mb-2">Technical Details</h4>
            <div className="text-sm text-text-secondary leading-relaxed whitespace-pre-line bg-surface-card p-3 sm:p-3.5 rounded-xl border border-surface-border break-words">
              {item.details}
            </div>
          </div>
        )}

        {freshness?.history && freshness.history.length > 0 && (
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-text-muted mb-2 flex items-center gap-1.5">
              <Clock size={13} />
              <span>Change Drift Timeline ({freshness.history.length})</span>
            </h4>
            <div className="space-y-2">
              {freshness.history.map((h) => (
                <div key={h.id} className="rounded-xl border border-surface-border bg-surface-card p-3 text-xs space-y-1">
                  <div className="flex items-center justify-between text-text-muted">
                    <span className="inline-flex items-center gap-1 font-mono text-primary-indigo font-bold">
                      <GitCommit size={12} />
                      {h.commitSha.substring(0, 7)}
                    </span>
                    <span>{formatDate(h.detectedAt)}</span>
                  </div>
                  <p className="font-mono text-[11px] text-text-primary break-all">
                    <span className="text-amber-700 font-semibold">{h.changeType}</span>: {h.filePath}
                  </p>
                  {h.commitMessage && (
                    <p className="text-text-muted italic text-[11px] truncate">{h.commitMessage}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-text-muted mb-2">Supporting Evidence ({item.sources.length})</h4>
          {item.sources.length === 0 ? (
            <p className="text-sm text-text-muted">No sources recorded.</p>
          ) : (
            <ul className="space-y-2.5">
              {item.sources.map((s) => {
                const url = safeUrl(s.url)
                return (
                  <li key={s.id} className="rounded-xl border border-surface-border bg-surface-card p-3 text-xs space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-text-primary truncate">{s.type}: {s.reference}</span>
                      {url && (
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-primary-indigo hover:underline font-medium shrink-0"
                        >
                          Open <ExternalLink size={12} aria-hidden />
                        </a>
                      )}
                    </div>
                    {s.excerpt && (
                      <pre className="rounded-lg bg-surface-background p-2 font-mono text-[11px] text-text-secondary whitespace-pre-wrap break-words border border-surface-border/50 max-w-full overflow-x-auto">
                        {s.excerpt}
                      </pre>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </motion.aside>
    </motion.div>
  )
}
