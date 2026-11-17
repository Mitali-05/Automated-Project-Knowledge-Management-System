import { useState } from 'react'
import { ChevronDown, ChevronUp, Copy, Check, ExternalLink, FileCode, GitCommit, AlertTriangle } from 'lucide-react'
import type { Citation } from '../../../api/types'
import { cn } from '../../../lib/cn'

interface SourceCitationCardProps {
  citation: Citation
  defaultExpanded?: boolean
}

export function SourceCitationCard({ citation, defaultExpanded = false }: SourceCitationCardProps) {
  const [expanded, setExpanded] = useState(defaultExpanded)
  const [copied, setCopied] = useState(false)

  const isStale = citation.changeStatus === 'POTENTIALLY_STALE' || citation.changeStatus === 'OUTDATED'

  const copyExcerpt = () => {
    if (!citation.excerpt) return
    navigator.clipboard.writeText(citation.excerpt).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className={cn(
      'rounded-xl border transition-all duration-200 bg-surface-card',
      isStale ? 'border-amber-200 bg-amber-50/30' : 'border-surface-border hover:border-primary-indigo/40'
    )}>
      <div
        onClick={() => setExpanded(!expanded)}
        className="flex cursor-pointer items-start justify-between gap-3 p-3 text-left"
      >
        <div className="flex items-start gap-2.5 min-w-0">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary-indigo/10 text-xs font-bold text-primary-indigo">
            {citation.index}
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <h4 className="text-sm font-semibold text-text-primary truncate max-w-xs">{citation.title}</h4>
              {citation.module && (
                <span className="rounded bg-surface-border/60 px-1.5 py-0.5 text-[10px] font-medium text-text-muted">
                  {citation.module}
                </span>
              )}
              {isStale && (
                <span className="inline-flex items-center gap-1 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">
                  <AlertTriangle size={10} aria-hidden />
                  {citation.changeStatus === 'OUTDATED' ? 'Outdated' : 'Potentially Stale'}
                </span>
              )}
            </div>
            {citation.sourceFile && (
              <p className="mt-1 flex items-center gap-1.5 text-xs text-text-secondary truncate">
                <FileCode size={12} className="shrink-0 text-text-muted" aria-hidden />
                <span className="truncate">{citation.sourceFile}</span>
              </p>
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {citation.url && (
            <a
              href={citation.url}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="rounded p-1 text-text-muted hover:bg-surface-background hover:text-primary-indigo transition-colors"
              title="Open source in GitHub"
            >
              <ExternalLink size={14} aria-hidden />
            </a>
          )}
          <button
            type="button"
            className="rounded p-1 text-text-muted hover:text-text-primary"
            aria-label={expanded ? 'Collapse source details' : 'Expand source details'}
          >
            {expanded ? <ChevronUp size={16} aria-hidden /> : <ChevronDown size={16} aria-hidden />}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-surface-border/60 px-3 pb-3 pt-2 text-xs space-y-2">
          {citation.commitSha && (
            <div className="flex items-center gap-1.5 text-text-muted">
              <GitCommit size={12} aria-hidden />
              <span>Affected at commit: <code className="font-mono text-text-primary">{citation.commitSha.substring(0, 7)}</code></span>
            </div>
          )}
          {citation.excerpt && (
            <div className="relative rounded-lg bg-surface-background p-2.5 font-mono text-[11px] text-text-secondary border border-surface-border/50">
              <button
                type="button"
                onClick={copyExcerpt}
                className="absolute right-2 top-2 rounded bg-surface-card p-1 text-text-muted hover:text-text-primary shadow-xs border border-surface-border/50"
                title="Copy excerpt"
              >
                {copied ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
              </button>
              <pre className="whitespace-pre-wrap break-words pr-6">{citation.excerpt}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
