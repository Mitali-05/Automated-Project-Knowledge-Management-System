import type { OrgRole, OrgType } from '../api/types'
import { Badge } from './ui/Badge'

export function RoleBadge({ role }: { role: OrgRole }) {
  return <Badge variant={role === 'owner' ? 'primary' : role === 'admin' ? 'success' : 'default'} className="capitalize">{role}</Badge>
}

export function OrgTypeLabel({ type }: { type: OrgType }) {
  return <span>{type === 'PERSONAL' ? 'Personal workspace' : 'Organization'}</span>
}
