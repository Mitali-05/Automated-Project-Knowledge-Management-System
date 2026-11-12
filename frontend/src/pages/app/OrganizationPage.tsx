import { Check, Copy } from 'lucide-react'
import { useState } from 'react'
import { orgApi } from '../../api/endpoints'
import { PageContainer, PageHeader } from '../../components/layout/PageContainer'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card'
import { ErrorState, LoadingState } from '../../components/ui/States'
import { useAsync } from '../../hooks/useAsync'
import { formatDate } from '../../lib/format'

export default function OrganizationPage() {
  const org = useAsync(() => orgApi.get(), [])
  const members = useAsync(() => orgApi.members(), [])
  const [copied, setCopied] = useState(false)

  if ((org.loading && !org.data) || (members.loading && !members.data)) return <PageContainer><LoadingState /></PageContainer>
  if (org.error || !org.data) return <PageContainer><ErrorState message={org.error ?? 'Could not load organization'} onRetry={org.reload} /></PageContainer>
  const info = org.data

  const copy = () => {
    navigator.clipboard.writeText(info.inviteCode).then(() => {
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    }).catch(() => undefined)
  }

  return (
    <PageContainer narrow>
      <PageHeader title={info.name} subtitle="Your organization and its members."
        action={<Badge variant={info.githubConnected ? 'success' : 'default'}>GitHub {info.githubConnected ? 'connected' : 'not connected'}</Badge>} />

      <Card>
        <CardHeader><CardTitle>Invite code</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-text-secondary">Share this code so teammates can join your organization when they sign up. Treat it like a password.</p>
          <div className="flex items-center gap-3">
            <code className="rounded-lg bg-primary-light-indigo px-4 py-2 text-lg font-semibold tracking-widest text-primary-indigo">{info.inviteCode}</code>
            <Button variant="outline" onClick={copy}>{copied ? <Check size={16} aria-hidden /> : <Copy size={16} aria-hidden />}{copied ? 'Copied' : 'Copy'}</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Members ({info.memberCount})</CardTitle></CardHeader>
        <CardContent>
          {members.error && <p className="text-sm text-danger">{members.error}</p>}
          <ul className="divide-y divide-surface-border">
            {(members.data ?? []).map((m) => (
              <li key={m.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-primary-indigo to-primary-violet font-semibold text-white" aria-hidden>{m.name.charAt(0).toUpperCase()}</span>
                  <div><p className="font-medium">{m.name}</p><p className="text-text-muted">{m.email}</p></div>
                </div>
                <span className="text-xs text-text-muted">Joined {formatDate(m.joinedAt)}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </PageContainer>
  )
}
