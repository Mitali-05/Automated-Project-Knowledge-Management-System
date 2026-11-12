import { AnimatePresence, motion } from 'framer-motion'
import { BookOpen, ExternalLink, Search, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { knowledgeApi } from '../../api/endpoints'
import type { KnowledgeItem } from '../../api/types'
import { Badge } from '../../components/ui/Badge'
import { Card, CardContent } from '../../components/ui/Card'
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States'
import { useAsync } from '../../hooks/useAsync'
import { useProject } from '../../hooks/useProject'
import { cn } from '../../lib/cn'
import { formatDate, safeUrl } from '../../lib/format'
import { freshnessTone } from '../../lib/tones'

export default function KnowledgeTab() {
  const { detail } = useProject()
  const { data, loading, error, reload } = useAsync(() => knowledgeApi.list(detail.project.id), [detail.project.id])
  const [type, setType] = useState('All')
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<KnowledgeItem | null>(null)

  const types = useMemo(() => ['All', ...new Set((data ?? []).map((k) => k.type))], [data])
  const items = useMemo(() => {
    const q = query.trim().toLowerCase()
    return (data ?? []).filter((k) => (type === 'All' || k.type === type) && (!q || `${k.title} ${k.summary} ${k.module ?? ''}`.toLowerCase().includes(q)))
  }, [data, type, query])

  if (loading && !data) return <LoadingState />
  if (error) return <ErrorState message={error} onRetry={reload} />

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Knowledge</h2>
      {(data ?? []).length === 0 ? (
        <EmptyState icon={<BookOpen size={32} />} title="No knowledge yet" description="Once the repositories are synced, extracted decisions, workflows and module summaries appear here with their sources." />
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" aria-hidden />
              <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search knowledge" aria-label="Search knowledge"
                className="h-9 w-64 rounded-md border border-surface-border bg-surface-card pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-indigo" />
            </div>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by type">
              {types.map((t) => (
                <button key={t} onClick={() => setType(t)} aria-pressed={type === t}
                  className={cn('rounded-full border px-3 py-1 text-xs font-medium transition-colors', type === t ? 'border-primary-indigo bg-primary-indigo text-white' : 'border-surface-border bg-surface-card text-text-secondary hover:bg-primary-light-indigo')}>{t}</button>
              ))}
            </div>
          </div>
          {items.length === 0 && <p className="text-sm text-text-muted">No items match your filters.</p>}
          <div className="grid gap-6 md:grid-cols-2">
            {items.map((k, i) => (
              <motion.div key={k.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: Math.min(i, 8) * 0.05 }}>
                <Card role="button" tabIndex={0} onClick={() => setSelected(k)} onKeyDown={(e) => e.key === 'Enter' && setSelected(k)}
                  className="group h-full cursor-pointer transition-all duration-300 hover:border-primary-indigo/40 hover:shadow-xl">
                  <CardContent className="p-6">
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                      <Badge variant="primary">{k.type}</Badge><Badge variant={freshnessTone(k.freshness)}>{k.freshness}</Badge>{k.module && <Badge variant="outline">{k.module}</Badge>}
                    </div>
                    <h3 className="font-semibold transition-colors group-hover:text-primary-indigo">{k.title}</h3>
                    <p className="mt-1 line-clamp-3 text-sm text-text-secondary">{k.summary}</p>
                    <p className="mt-4 text-xs text-text-muted">{k.sources.length} source{k.sources.length === 1 ? '' : 's'} · updated {formatDate(k.updatedAt)}</p>
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
          <motion.div key="overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm" onClick={() => setSelected(null)}>
            <motion.aside role="dialog" aria-modal="true" aria-label={selected.title} initial={{ x: 40 }} animate={{ x: 0 }} exit={{ x: 40 }} transition={{ type: 'spring', stiffness: 320, damping: 32 }}
              className="h-full w-full max-w-lg overflow-y-auto bg-surface-card p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <div className="mb-4 flex items-start justify-between gap-3">
                <h3 className="text-lg font-bold">{selected.title}</h3>
                <button onClick={() => setSelected(null)} aria-label="Close" className="rounded p-1 hover:bg-surface-background"><X size={20} aria-hidden /></button>
              </div>
              <div className="mb-4 flex flex-wrap gap-2">
                <Badge variant="primary">{selected.type}</Badge><Badge variant={freshnessTone(selected.freshness)}>{selected.freshness}</Badge>
                {selected.confidence != null && <Badge>Confidence {Math.round(selected.confidence * 100)}%</Badge>}
              </div>
              <p className="mb-3 text-sm">{selected.summary}</p>
              {selected.details && <p className="mb-6 whitespace-pre-line text-sm text-text-secondary">{selected.details}</p>}
              <h4 className="mb-2 text-sm font-semibold">Evidence</h4>
              {selected.sources.length === 0 && <p className="text-sm text-text-muted">No sources recorded.</p>}
              <ul className="space-y-3">
                {selected.sources.map((s) => {
                  const url = safeUrl(s.url)
                  return (
                    <li key={s.id} className="rounded-lg border border-surface-border p-3 text-sm">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium">{s.type} {s.reference}</span>
                        {url && <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary-indigo hover:text-primary-violet">Open <ExternalLink size={12} aria-hidden /></a>}
                      </div>
                      {s.excerpt && <p className="mt-1 text-xs text-text-secondary">{s.excerpt}</p>}
                    </li>
                  )
                })}
              </ul>
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>,
      document.body)}
    </div>
  )
}
