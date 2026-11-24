import type { ProjectSummary, SyncStatus } from '../api/types'
import type { BadgeVariant } from '../components/ui/Badge'

export function projectSyncLabel(project: Pick<ProjectSummary, 'repositoryCount' | 'syncStatus'>): SyncStatus {
  if (project.repositoryCount === 0) return 'No repositories'
  return project.syncStatus.toUpperCase() === 'PENDING' ? 'Queued' : project.syncStatus
}

export function syncTone(status: string): BadgeVariant {
  switch (status) {
    case 'No repositories': return 'default'
    case 'Synced': return 'success'
    case 'Failed': return 'danger'
    case 'Syncing': return 'primary'
    default: return 'warning'
  }
}

export function freshnessTone(freshness: string): BadgeVariant {
  switch (freshness) {
    case 'Fresh': return 'success'
    case 'Stale': return 'warning'
    default: return 'danger'
  }
}
