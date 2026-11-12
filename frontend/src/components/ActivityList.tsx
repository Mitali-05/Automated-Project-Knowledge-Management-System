import { ExternalLink, GitCommit } from 'lucide-react'
import type { Activity } from '../api/types'
import { safeUrl, timeAgo } from '../lib/format'

export function ActivityList({ items, showProject = false }: { items: Activity[]; showProject?: boolean }) {
  return (
    <ol className="space-y-4">
      {items.map((a) => {
        const url = safeUrl(a.url)
        return (
          <li key={a.id} className="flex gap-3">
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-light-indigo text-primary-indigo"><GitCommit size={16} aria-hidden /></span>
            <div className="min-w-0 flex-1">
              <p className="break-words text-sm font-medium text-text-primary">
                {a.title}
                {url && (
                  <a href={url} target="_blank" rel="noopener noreferrer" className="ml-1 inline-flex align-middle text-primary-indigo hover:text-primary-violet" aria-label="Open on GitHub">
                    <ExternalLink size={14} aria-hidden />
                  </a>
                )}
              </p>
              <p className="text-xs text-text-muted">{[a.actor, showProject ? a.projectName : null, a.sourceRef, timeAgo(a.occurredAt)].filter(Boolean).join(' · ')}</p>
            </div>
          </li>
        )
      })}
    </ol>
  )
}
