import { BookOpen, Clock, GitBranch, Users } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import type { ProjectSummary } from '../api/types'
import { syncTone } from '../lib/tones'
import { timeAgo } from '../lib/format'
import { Badge } from './ui/Badge'
import { Card, CardContent } from './ui/Card'

export function ProjectCard({ project }: { project: ProjectSummary }) {
  const navigate = useNavigate()
  const open = () => navigate(`/app/projects/${project.id}`)
  return (
    <Card
      role="link" tabIndex={0}
      onClick={open} onKeyDown={(e) => e.key === 'Enter' && open()}
      className="group h-full cursor-pointer border-surface-border transition-all duration-300 hover:border-primary-indigo/40 hover:shadow-xl"
    >
      <CardContent className="flex h-full flex-col p-6">
        <div className="mb-4 flex items-start justify-between">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary-indigo to-primary-violet text-lg font-bold text-white shadow-md transition-transform group-hover:scale-105">
            {project.name.charAt(0).toUpperCase()}
          </div>
          <Badge variant={syncTone(project.syncStatus)}>{project.syncStatus}</Badge>
        </div>
        <h3 className="mb-2 line-clamp-1 text-xl font-bold text-text-primary transition-colors group-hover:text-primary-indigo">{project.name}</h3>
        <p className="mb-2 text-xs font-medium text-text-muted">{project.orgType === 'PERSONAL' ? 'Personal' : project.orgName}</p>
        <p className="mb-6 line-clamp-2 flex-1 text-sm text-text-secondary">{project.description || 'No description provided for this project.'}</p>
        <div className="mt-auto flex items-center gap-4 border-t border-surface-border pt-4 text-xs text-text-muted">
          <span className="flex items-center gap-1.5" title="Repositories"><GitBranch size={14} className="text-primary-indigo" aria-hidden />{project.repositoryCount}</span>
          <span className="flex items-center gap-1.5" title="Knowledge items"><BookOpen size={14} className="text-primary-indigo" aria-hidden />{project.knowledgeItemCount}</span>
          <span className="flex items-center gap-1.5" title="Members"><Users size={14} className="text-primary-indigo" aria-hidden />{project.memberCount}</span>
          <span className="ml-auto flex items-center gap-1.5" title="Last synced"><Clock size={14} className="text-primary-indigo" aria-hidden />{timeAgo(project.lastSyncedAt)}</span>
        </div>
      </CardContent>
    </Card>
  )
}
