import type { BadgeVariant } from '../components/ui/Badge'

export function syncTone(status: string): BadgeVariant {
  switch (status) {
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
