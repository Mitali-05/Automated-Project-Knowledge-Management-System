import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Check, Copy, ExternalLink, LogOut, RefreshCw, Trash2 } from 'lucide-react'
import { githubApi, orgApi } from '../../api/endpoints'
import type { OrgMember, OrgSummary } from '../../api/types'
import { RoleBadge } from '../../components/OrgBadges'
import { PageContainer, PageHeader } from '../../components/layout/PageContainer'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { Alert, ErrorState, LoadingState } from '../../components/ui/States'
import { useAuth } from '../../context/AuthContext'
import { useOrgs } from '../../context/OrgContext'
import { useAsync } from '../../hooks/useAsync'
import { errorMessage, formatDate } from '../../lib/format'

export default function OrganizationDetailPage() {
  const { orgId } = useParams()
  const id = Number(orgId)
  const navigate = useNavigate()
  const { user } = useAuth()
  const { refresh } = useOrgs()
  const detail = useAsync(() => orgApi.get(id), [id])
  const github = useAsync(() => githubApi.status(id), [id])
  const [name, setName] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  if (detail.loading && !detail.data) return <PageContainer narrow><LoadingState /></PageContainer>
  if (detail.error || !detail.data) {
    return <PageContainer narrow><ErrorState message={detail.error ?? 'Organization not found'} onRetry={detail.reload} /></PageContainer>
  }
  const org: OrgSummary = detail.data.organization
  const members = detail.data.members
  const isOwner = org.role === 'owner'
  const isAdmin = org.role !== 'member'
  const personal = org.type === 'PERSONAL'

  const act = async (key: string, fn: () => Promise<unknown>, success?: string) => {
    setBusy(key)
    setMsg(null)
    try {
      await fn()
      if (success) setMsg({ ok: true, text: success })
      detail.reload()
      void refresh()
    } catch (err) {
      setMsg({ ok: false, text: errorMessage(err) })
    } finally {
      setBusy(null)
    }
  }

  const copy = () => {
    if (!org.inviteCode) return
    navigator.clipboard.writeText(org.inviteCode).then(() => {
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    }).catch(() => undefined)
  }

  const rename = (e: FormEvent) => {
    e.preventDefault()
    void act('rename', () => orgApi.rename(id, (name ?? org.name).trim()), 'Name updated')
  }

  const rotate = () => {
    if (!window.confirm('Generate a new invite code? The old code will stop working immediately.')) return
    void act('rotate', () => orgApi.rotateInviteCode(id), 'New invite code generated')
  }

  const canRemove = (m: OrgMember) => m.userId !== user?.id && m.role !== 'owner' && (isOwner || (isAdmin && m.role === 'member'))

  const remove = (m: OrgMember) => {
    if (!window.confirm(`Remove ${m.name} from ${org.name}? They will lose access to all of its projects.`)) return
    void act(`rm${m.userId}`, () => orgApi.removeMember(id, m.userId), `${m.name} was removed`)
  }

  const leave = async () => {
    if (!window.confirm(`Leave ${org.name}? You will lose access to its projects.`)) return
    setBusy('leave')
    try {
      await orgApi.leave(id)
      await refresh()
      navigate('/app/organizations', { replace: true })
    } catch (err) {
      setMsg({ ok: false, text: errorMessage(err) })
      setBusy(null)
    }
  }

  const removeOrg = async () => {
    if (!window.confirm(`Delete ${org.name}? This cannot be undone. All members will lose access.`)) return
    setBusy('delete')
    try {
      await orgApi.remove(id)
      await refresh()
      navigate('/app/organizations', { replace: true })
    } catch (err) {
      setMsg({ ok: false, text: errorMessage(err) })
      setBusy(null)
    }
  }

  const gh = github.data

  return (
    <PageContainer narrow>
      <Link to="/app/organizations" className="inline-flex items-center gap-1 text-sm text-text-secondary hover:text-primary-indigo"><ArrowLeft size={14} aria-hidden /> All organizations</Link>
      <PageHeader title={org.name} subtitle={personal ? 'Your personal workspace.' : `${org.memberCount} member${org.memberCount === 1 ? '' : 's'} · created ${formatDate(org.createdAt)}`}
        action={<RoleBadge role={org.role} />} />

      {msg && <Alert tone={msg.ok ? 'success' : 'error'}>{msg.text}</Alert>}

      {!personal && isAdmin && org.inviteCode && (
        <Card>
          <CardHeader><CardTitle>Invite code</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-text-secondary">Anyone with this code can join as a member. Treat it like a password, and generate a new one if it leaks.</p>
            <div className="flex flex-wrap items-center gap-3">
              <code className="rounded-lg bg-primary-light-indigo px-4 py-2 text-lg font-semibold tracking-widest text-primary-indigo">{org.inviteCode}</code>
              <Button variant="outline" onClick={copy}>{copied ? <Check size={16} aria-hidden /> : <Copy size={16} aria-hidden />}{copied ? 'Copied' : 'Copy'}</Button>
              <Button variant="ghost" onClick={rotate} isLoading={busy === 'rotate'}><RefreshCw size={16} aria-hidden /> New code</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>GitHub connection</CardTitle>
          <Badge variant={org.githubConnected ? 'success' : 'default'}>{org.githubConnected ? 'Connected' : 'Not connected'}</Badge>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p className="text-text-secondary">Projects in this {personal ? 'workspace' : 'organization'} use this connection to read repositories, including private ones. PRISM keeps only the extracted knowledge and links back to the source.</p>
          {github.loading && !gh ? <p className="text-text-muted">Checking connection...</p>
            : gh && !gh.configured ? <Alert tone="info">The PRISM GitHub App is not configured on this server yet. Public repository links still work.</Alert>
            : gh && !gh.connected && gh.canManage && gh.installUrl ? <a href={gh.installUrl}><Button><ExternalLink size={16} aria-hidden /> Connect GitHub</Button></a>
            : gh && !gh.connected ? <p className="text-text-muted">Ask an owner or admin to connect GitHub for this organization.</p>
            : null}
          {gh && gh.connected && isAdmin && (
            <div className="pt-2 flex items-center justify-between border-t border-surface-border">
              <span className="text-xs text-text-muted">GitHub installation active.</span>
              <Button variant="outline" onClick={() => {
                if (window.confirm(`Disconnect GitHub from ${org.name}?`)) {
                  void act('disconnectGh', () => githubApi.disconnect(id), 'GitHub disconnected')
                }
              }} isLoading={busy === 'disconnectGh'}>Disconnect GitHub</Button>
            </div>
          )}
        </CardContent>
      </Card>

      {isAdmin && (
        <Card>
          <CardHeader><CardTitle>{personal ? 'Workspace name' : 'Organization name'}</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={rename} className="flex items-end gap-3">
              <Input label="Name" value={name ?? org.name} maxLength={150} onChange={(e) => setName(e.target.value)} />
              <Button type="submit" isLoading={busy === 'rename'} disabled={!(name ?? org.name).trim() || (name ?? org.name).trim() === org.name}>Save</Button>
            </form>
          </CardContent>
        </Card>
      )}

      {!personal && (
        <Card>
          <CardHeader><CardTitle>Members ({members.length})</CardTitle></CardHeader>
          <CardContent>
            <ul className="divide-y divide-surface-border">
              {members.map((m) => (
                <li key={m.userId} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-primary-indigo to-primary-violet font-semibold text-white" aria-hidden>{m.name.charAt(0).toUpperCase()}</span>
                    <div><p className="font-medium">{m.name}{m.userId === user?.id && ' (you)'}</p><p className="text-text-muted">{m.email}</p></div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="hidden text-xs text-text-muted sm:inline">Joined {formatDate(m.joinedAt)}</span>
                    {isOwner && m.role !== 'owner' ? (
                      <select
                        aria-label={`Role of ${m.name}`} value={m.role} disabled={busy === `role${m.userId}`}
                        onChange={(e) => void act(`role${m.userId}`, () => orgApi.setRole(id, m.userId, e.target.value as 'admin' | 'member'), `${m.name} is now ${e.target.value}`)}
                        className="h-8 rounded-lg border border-surface-border bg-surface-card px-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary-indigo"
                      >
                        <option value="member">Member</option>
                        <option value="admin">Admin</option>
                      </select>
                    ) : <RoleBadge role={m.role} />}
                    {canRemove(m) && (
                      <Button variant="ghost" size="sm" aria-label={`Remove ${m.name}`} disabled={busy === `rm${m.userId}`} onClick={() => remove(m)}><Trash2 size={16} aria-hidden /></Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {!personal && isOwner && (
        <Card className="border-red-200">
          <CardHeader><CardTitle className="text-danger">Danger zone</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-text-secondary">Deleting {org.name} removes it for every member. It must have no projects, so delete or move them first.</p>
            <Button variant="danger" onClick={() => void removeOrg()} isLoading={busy === 'delete'}><Trash2 size={16} aria-hidden /> Delete organization</Button>
          </CardContent>
        </Card>
      )}

      {!personal && !isOwner && (
        <Card className="border-red-200">
          <CardHeader><CardTitle className="text-danger">Leave organization</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-text-secondary">You will lose access to every project in {org.name}.</p>
            <Button variant="danger" onClick={() => void leave()} isLoading={busy === 'leave'}><LogOut size={16} aria-hidden /> Leave {org.name}</Button>
          </CardContent>
        </Card>
      )}
    </PageContainer>
  )
}
