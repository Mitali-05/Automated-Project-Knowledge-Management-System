import { AnimatePresence, motion } from 'framer-motion'
import { BookOpen, Search, ShieldCheck, AlertTriangle, HelpCircle, AlertCircle } from 'lucide-react'
import { useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { knowledgeApi } from '../../api/endpoints'
import type { ChangeFreshness, KnowledgeItem } from '../../api/types'
import { Badge } from '../../components/ui/Badge'
import { Card, CardContent } from '../../components/ui/Card'
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States'
import { useAsync } from '../../hooks/useAsync'
import { useProject } from '../../hooks/useProject'
import { cn } from '../../lib/cn'
import { formatDate } from '../../lib/format'
import { freshnessTone } from '../../lib/tones'
import { KnowledgeDetailDrawer } from './KnowledgeDetailDrawer'

export default function KnowledgeTab() {
  const { detail } = useProject()
  const { data, loading, error, reload } = useAsync(() => knowledgeApi.list(detail.project.id), [detail.project.id])
  const [type, setType] = useState('All')
  const [changeFilter, setChangeFilter] = useState<string>('All')
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<KnowledgeItem | null>(null)

  const types = useMemo(() => ['All', ...new Set((data ?? []).map((k) => k.type))], [data])
  const changeFilters = ['All', 'Current', 'Potentially Stale', 'Outdated', 'Unknown']

  const items = useMemo(() => {
    const q = query.trim().toLowerCase()
    return (data ?? []).filter((k) => {
      const matchType = type === 'All' || k.type === type
      const statusKey = (k.changeFreshness || 'UNKNOWN').replace('_', ' ').toLowerCase()
      const matchChange = changeFilter === 'All' || statusKey === changeFilter.toLowerCase()
      const matchQuery = !q || `${k.title} ${k.summary} ${k.module ?? ''}`.toLowerCase().includes(q)
      return matchType && matchChange && matchQuery
    })
  }, [data, type, changeFilter, query])

  if (loading && !data) return <LoadingState />
  if (error) return <ErrorState message={error} onRetry={reload} />

  const renderChangeBadge = (status?: ChangeFreshness) => {
    const s = status || 'UNKNOWN'
    switch (s) {
      case 'CURRENT':
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
            <ShieldCheck size={12} />
            <span>Current</span>
          </span>
        )
      case 'POTENTIALLY_STALE':
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 border border-amber-200 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
            <AlertTriangle size={12} />
            <span>Potentially Stale</span>
          </span>
        )
      case 'OUTDATED':
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-red-50 border border-red-200 px-2 py-0.5 text-[11px] font-semibold text-red-700">
            <AlertCircle size={12} />
            <span>Outdated</span>
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 border border-slate-200 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
            <HelpCircle size={12} />
            <span>Unknown</span>
          </span>
        )
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">Knowledge Base</h2>
          <p className="text-xs text-text-muted mt-0.5">
            Structured architectural knowledge with independent age & repository drift tracking.
          </p>
        </div>
      </div>

      {(data ?? []).length === 0 ? (
        <EmptyState
          icon={<BookOpen size={32} />}
          title="No knowledge yet"
          description="Once repositories are synced, decisions, module summaries and workflows appear here with provenance citations."
        />
      ) : (
        <>
          <div className="flex flex-col gap-3 rounded-2xl border border-surface-border bg-surface-card p-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[240px]">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" aria-hidden />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search knowledge by title, module, or summary..."
                  aria-label="Search knowledge"
                  className="h-10 w-full rounded-xl border border-surface-border bg-surface-background pl-9 pr-3 text-sm focus:outline-hidden focus:ring-2 focus:ring-primary-indigo"
                />
              </div>

              <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filter by change freshness">
                <span className="text-xs font-semibold text-text-muted mr-1">Drift:</span>
                {changeFilters.map((cf) => (
                  <button
                    key={cf}
                    onClick={() => setChangeFilter(cf)}
                    aria-pressed={changeFilter === cf}
                    className={cn(
                      'rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer',
                      changeFilter === cf
                        ? 'border-primary-indigo bg-primary-indigo text-white shadow-xs'
                        : 'border-surface-border bg-surface-background text-text-secondary hover:bg-surface-border/50'
                    )}
                  >
                    {cf}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-surface-border/60" role="group" aria-label="Filter by type">
              <span className="text-xs font-semibold text-text-muted mr-1">Type:</span>
              {types.map((t) => (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  aria-pressed={type === t}
                  className={cn(
                    'rounded-full border px-3 py-0.5 text-xs font-medium transition-colors cursor-pointer',
                    type === t
                      ? 'border-primary-indigo bg-primary-light-indigo text-primary-indigo font-semibold'
                      : 'border-surface-border bg-surface-background text-text-secondary hover:bg-surface-border/40'
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {items.length === 0 && (
            <p className="py-8 text-center text-sm text-text-muted">
              No knowledge items match your current filters.
            </p>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            {items.map((k, i) => (
              <motion.div
                key={k.id}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: Math.min(i, 8) * 0.04 }}
              >
                <Card
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelected(k)}
                  onKeyDown={(e) => e.key === 'Enter' && setSelected(k)}
                  className="group h-full cursor-pointer transition-all duration-200 hover:border-primary-indigo/50 hover:shadow-md"
                >
                  <CardContent className="p-5 flex flex-col justify-between h-full">
                    <div>
                      <div className="mb-2.5 flex flex-wrap items-center gap-2">
                        <Badge variant="primary">{k.type}</Badge>
                        {renderChangeBadge(k.changeFreshness)}
                        <Badge variant={freshnessTone(k.freshness)}>Age: {k.freshness}</Badge>
                        {k.module && <Badge variant="outline">{k.module}</Badge>}
                      </div>
                      <h3 className="font-bold text-base text-text-primary group-hover:text-primary-indigo transition-colors line-clamp-2">
                        {k.title}
                      </h3>
                      <p className="mt-1.5 line-clamp-3 text-xs text-text-secondary leading-relaxed">
                        {k.summary}
                      </p>
                    </div>
                    <div className="mt-4 pt-3 border-t border-surface-border/60 flex items-center justify-between text-[11px] text-text-muted">
                      <span>{k.sources.length} cited source{k.sources.length === 1 ? '' : 's'}</span>
                      <span>Updated {formatDate(k.updatedAt)}</span>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </>
      )}

      {createPortal(
        <AnimatePresence>
          {selected && (
            <KnowledgeDetailDrawer
              item={selected}
              projectId={detail.project.id}
              onClose={() => setSelected(null)}
              onRevalidated={() => {
                void reload()
              }}
            />
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  )
}
