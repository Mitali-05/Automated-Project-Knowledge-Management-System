import { BookOpen, GitBranch, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { ProjectSummary } from '../api/types'
import { timeAgo } from '../lib/format'
import { syncTone } from '../lib/tones'
import { Badge } from './ui/Badge'

/** Compact one-line project entry for the list view. */
export function ProjectRow({ project: p }: { project: ProjectSummary }) {
  return (
    <Link to={`/app/projects/${p.id}`} className="flex items-center gap-4 px-4 py-3 transition-colors hover:bg-primary-light-indigo/40">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary-indigo to-primary-violet font-bold text-white">{p.name.charAt(0).toUpperCase()}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-semibold text-text-primary">{p.name}</span>
        <span className="block truncate text-xs text-text-muted">{p.orgType === 'PERSONAL' ? 'Personal' : p.orgName} · {p.role}</span>
      </span>
      <span className="hidden items-center gap-4 text-xs text-text-muted md:flex">
        <span className="flex items-center gap-1.5" title="Repositories"><GitBranch size={14} aria-hidden />{p.repositoryCount}</span>
        <span className="flex items-center gap-1.5" title="Knowledge items"><BookOpen size={14} aria-hidden />{p.knowledgeItemCount}</span>
        <span className="flex items-center gap-1.5" title="Members"><Users size={14} aria-hidden />{p.memberCount}</span>
        <span className="w-20 text-right">{timeAgo(p.lastSyncedAt)}</span>
      </span>
      <Badge variant={syncTone(p.syncStatus)}>{p.syncStatus}</Badge>
    </Link>
  )
}
