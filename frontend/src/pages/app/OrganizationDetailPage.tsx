import { useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Check, Copy, ExternalLink, LogOut, RefreshCw, Trash2 } from 'lucide-react'
import { githubApi, orgApi, projectApi } from '../../api/endpoints'
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

  const [leaveError, setLeaveError] = useState<string | null>(null)
  const [ownedProjects, setOwnedProjects] = useState<{ id: number; name: string }[]>([])
  const [deleteOwnedOnLeave, setDeleteOwnedOnLeave] = useState(false)
  const leaveDialog = useRef<HTMLDialogElement>(null)

  const [deleteOrgError, setDeleteOrgError] = useState<string | null>(null)
  const [deleteAllProjectsOnDelete, setDeleteAllProjectsOnDelete] = useState(false)
  const deleteOrgDialog = useRef<HTMLDialogElement>(null)

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

  const openLeaveDialog = () => {
    setLeaveError(null)
    setOwnedProjects([])
    setDeleteOwnedOnLeave(false)
    leaveDialog.current?.showModal()

    // Immediately fetch user projects to identify blockers directly from existing API
    void projectApi.list().then((list) => {
      const owned = list.filter((p) => p.orgId === id && (p.role?.toLowerCase() === 'owner')).map((p) => ({ id: p.id, name: p.name }))
      if (owned.length > 0) {
        setOwnedProjects(owned)
      } else {
        void orgApi.leaveBlockers(id).then((blockers) => {
          if (blockers && blockers.length > 0) setOwnedProjects(blockers)
        }).catch(() => [])
      }
    }).catch(() => {
      void orgApi.leaveBlockers(id).then((blockers) => {
        if (blockers && blockers.length > 0) setOwnedProjects(blockers)
      }).catch(() => [])
    })
  }

  const leave = async () => {
    setBusy('leave')
    setLeaveError(null)
    try {
      if (deleteOwnedOnLeave) {
        let toDelete = ownedProjects
        if (toDelete.length === 0) {
          const list = await projectApi.list().catch(() => [])
          toDelete = list.filter((p) => p.orgId === id && (p.role?.toLowerCase() === 'owner')).map((p) => ({ id: p.id, name: p.name }))
        }
        for (const p of toDelete) {
          try {
            await projectApi.remove(p.id)
          } catch (e) {
            console.error(`Failed to remove project ${p.id}:`, e)
          }
        }
      }
      await orgApi.leave(id, deleteOwnedOnLeave)
      leaveDialog.current?.close()
      void refresh().catch(() => undefined)
      navigate('/app/organizations', { replace: true })
    } catch (err) {
      setLeaveError(errorMessage(err))
      void projectApi.list().then((list) => {
        const owned = list.filter((p) => p.orgId === id && (p.role?.toLowerCase() === 'owner')).map((p) => ({ id: p.id, name: p.name }))
        if (owned.length > 0) {
          setOwnedProjects(owned)
        }
      }).catch(() => [])
    } finally {
      setBusy(null)
    }
  }

  const openDeleteOrgDialog = () => {
    setDeleteOrgError(null)
    setDeleteAllProjectsOnDelete(false)
    deleteOrgDialog.current?.showModal()
  }

  const removeOrg = async () => {
    setBusy('delete')
    setDeleteOrgError(null)
    try {
      if (deleteAllProjectsOnDelete) {
        const list = await projectApi.list().catch(() => [])
        const orgProjects = list.filter((p) => p.orgId === id)
        for (const p of orgProjects) {
          await projectApi.remove(p.id)
        }
      }
      await orgApi.remove(id, deleteAllProjectsOnDelete)
      deleteOrgDialog.current?.close()
      await refresh()
      navigate('/app/organizations', { replace: true })
    } catch (err) {
      setDeleteOrgError(errorMessage(err))
      setBusy(null)
    }
  }

  const gh = github.data

  return (
    <PageContainer narrow>
      <Link to="/app/organizations" className="inline-flex items-center gap-1 text-xs sm:text-sm text-text-secondary hover:text-primary-indigo"><ArrowLeft size={14} aria-hidden /> All organizations</Link>
      <PageHeader title={org.name} subtitle={personal ? 'Your personal workspace.' : `${org.memberCount} member${org.memberCount === 1 ? '' : 's'} · created ${formatDate(org.createdAt)}`}
        action={<RoleBadge role={org.role} />} />

      {msg && <Alert tone={msg.ok ? 'success' : 'error'}>{msg.text}</Alert>}

      {!personal && isAdmin && org.inviteCode && (
        <Card>
          <CardHeader><CardTitle>Invite code</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs sm:text-sm text-text-secondary">Anyone with this code can join as a member. Treat it like a password, and generate a new one if it leaks.</p>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <code className="rounded-xl bg-primary-light-indigo px-3 sm:px-4 py-2 text-base sm:text-lg font-semibold tracking-widest text-primary-indigo">{org.inviteCode}</code>
              <Button variant="outline" size="sm" onClick={copy}>{copied ? <Check size={14} aria-hidden /> : <Copy size={14} aria-hidden />}{copied ? 'Copied' : 'Copy'}</Button>
              <Button variant="ghost" size="sm" onClick={rotate} isLoading={busy === 'rotate'}><RefreshCw size={14} aria-hidden /> New code</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>GitHub connection</CardTitle>
          <Badge variant={org.githubConnected ? 'success' : 'default'}>{org.githubConnected ? 'Connected' : 'Not connected'}</Badge>
        </CardHeader>
        <CardContent className="space-y-3 text-xs sm:text-sm">
          <p className="text-text-secondary">Projects in this {personal ? 'workspace' : 'organization'} use this connection to read repositories, including private ones. PRISM keeps only the extracted knowledge and links back to the source.</p>
          {github.loading && !gh ? <p className="text-text-muted">Checking connection...</p>
            : gh && !gh.configured ? <Alert tone="info">The PRISM GitHub App is not configured on this server yet. Public repository links still work.</Alert>
            : gh && !gh.connected && gh.canManage && gh.installUrl ? (
              <div className="flex flex-wrap items-center gap-3">
                <a href={gh.installUrl}><Button><ExternalLink size={16} aria-hidden /> Connect GitHub</Button></a>
                {gh.authorizationUrl && <a href={gh.authorizationUrl} className="font-medium text-primary-indigo hover:underline">Connect existing installation</a>}
              </div>
            )
            : null}
        </CardContent>
      </Card>

      {!personal && (
        <Card>
          <CardHeader><CardTitle>Members</CardTitle></CardHeader>
          <CardContent>
            <ul className="divide-y divide-surface-border">
              {members.map((m) => (
                <li key={m.userId} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-3 text-xs sm:text-sm">
                  <div>
                    <p className="font-semibold">{m.name}{m.userId === user?.id && ' (you)'}</p>
                    <p className="text-xs text-text-muted">{m.email}</p>
                  </div>
                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    <RoleBadge role={m.role} />
                    {canRemove(m) && (
                      <Button variant="ghost" size="sm" aria-label={`Remove ${m.name}`} disabled={busy === `rm${m.userId}`} onClick={() => remove(m)}>
                        <Trash2 size={15} aria-hidden />
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {!personal && isOwner && (
        <Card>
          <CardHeader><CardTitle>Rename organization</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={rename} className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <Input value={name ?? org.name} onChange={(e) => setName(e.target.value)} maxLength={150} />
              </div>
              <Button type="submit" isLoading={busy === 'rename'} disabled={!name || name.trim() === org.name}>Save</Button>
            </form>
          </CardContent>
        </Card>
      )}

      {!personal && (
        <Card className="border-red-200">
          <CardHeader><CardTitle className="text-danger">Danger zone</CardTitle></CardHeader>
          <CardContent className="space-y-4 text-xs sm:text-sm">
            {isOwner ? (
              <div className="space-y-3">
                <p className="text-text-secondary">Permanently delete this organization. Members will lose access to its projects and knowledge.</p>
                <Button variant="danger" size="sm" onClick={openDeleteOrgDialog}>Delete organization</Button>

                <dialog
                  ref={deleteOrgDialog}
                  aria-labelledby="delete-organization-title"
                  aria-describedby="delete-organization-description"
                  className="m-auto max-h-[calc(100%-2rem)] w-[calc(100%-2rem)] max-w-md overflow-y-auto rounded-xl border border-surface-border bg-surface-card p-6 text-text-primary shadow-xl backdrop:bg-black/50"
                  onCancel={(event) => { if (busy === 'delete') event.preventDefault() }}
                >
                  <h2 id="delete-organization-title" className="text-lg font-semibold text-danger">Delete {org.name}?</h2>
                  <p id="delete-organization-description" className="mt-2 text-sm text-text-secondary">
                    This action is permanent and cannot be undone. All members will lose access.
                  </p>

                  {deleteOrgError && <div className="mt-4"><Alert tone="error">{deleteOrgError}</Alert></div>}

                  {org.projectCount > 0 ? (
                    <div className="mt-4 rounded-xl border border-red-200 bg-red-50/70 p-3.5 text-xs sm:text-sm">
                      <p className="font-semibold text-red-950">
                        This organization currently contains {org.projectCount} project{org.projectCount === 1 ? '' : 's'}.
                      </p>
                      <label className="mt-3 flex items-start gap-2.5 cursor-pointer pt-2 border-t border-red-200/80">
                        <input
                          type="checkbox"
                          checked={deleteAllProjectsOnDelete}
                          onChange={(e) => setDeleteAllProjectsOnDelete(e.target.checked)}
                          className="mt-0.5 h-4 w-4 rounded border-red-300 text-danger focus:ring-danger"
                        />
                        <span className="text-xs font-semibold text-danger">
                          Delete all {org.projectCount} project{org.projectCount === 1 ? '' : 's'} and all associated data (repositories, knowledge, and history)
                        </span>
                      </label>
                    </div>
                  ) : (
                    <p className="mt-3 text-xs text-text-muted">This organization has no projects and can be deleted immediately.</p>
                  )}

                  <div className="mt-6 flex flex-wrap justify-end gap-2">
                    <Button variant="outline" disabled={busy === 'delete'} onClick={() => deleteOrgDialog.current?.close()}>Cancel</Button>
                    <Button
                      variant="danger"
                      isLoading={busy === 'delete'}
                      disabled={org.projectCount > 0 && !deleteAllProjectsOnDelete}
                      title={org.projectCount > 0 && !deleteAllProjectsOnDelete ? 'Check the box to delete all projects before deleting the organization' : undefined}
                      onClick={() => void removeOrg()}
                    >
                      Delete organization
                    </Button>
                  </div>
                </dialog>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-text-secondary">Leave this organization. You will lose access to its projects until someone invites you back.</p>
                <Button variant="outline" size="sm" onClick={openLeaveDialog}><LogOut size={14} aria-hidden /> Leave organization</Button>

                <dialog
                  ref={leaveDialog}
                  aria-labelledby="leave-organization-title"
                  aria-describedby="leave-organization-description"
                  className="m-auto max-h-[calc(100%-2rem)] w-[calc(100%-2rem)] max-w-md overflow-y-auto rounded-xl border border-surface-border bg-surface-card p-6 text-text-primary shadow-xl backdrop:bg-black/50"
                  onCancel={(event) => { if (busy === 'leave') event.preventDefault() }}
                >
                  <h2 id="leave-organization-title" className="text-lg font-semibold">Leave {org.name}?</h2>
                  <p id="leave-organization-description" className="mt-2 text-sm text-text-secondary">
                    You’ll lose access to this organization and its projects until someone invites you back.
                  </p>

                  {leaveError && <div className="mt-4"><Alert tone="error">{leaveError}</Alert></div>}

                  {(ownedProjects.length > 0 || Boolean(leaveError?.toLowerCase().includes('owns projects'))) && (
                    <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50/70 p-3.5 text-xs sm:text-sm">
                      <p className="font-semibold text-amber-900">
                        {ownedProjects.length > 0
                          ? `You are an owner of ${ownedProjects.length} project${ownedProjects.length === 1 ? '' : 's'} in this organization:`
                          : 'You own projects in this organization that must be handled before leaving:'}
                      </p>
                      {ownedProjects.length > 0 && (
                        <ul className="mt-2 list-disc pl-4 space-y-1 text-amber-900 font-medium">
                          {ownedProjects.map((project) => (
                            <li key={project.id}>
                              {project.name}{' '}
                              <Link to={`/app/projects/${project.id}/settings`} target="_blank" rel="noopener noreferrer" className="ml-1 text-xs text-primary-indigo underline font-normal">
                                (open project settings)
                              </Link>
                            </li>
                          ))}
                        </ul>
                      )}

                      <label className="mt-3 flex items-start gap-2.5 cursor-pointer pt-2 border-t border-amber-200/80">
                        <input
                          type="checkbox"
                          checked={deleteOwnedOnLeave}
                          onChange={(e) => setDeleteOwnedOnLeave(e.target.checked)}
                          className="mt-0.5 h-4 w-4 rounded border-amber-300 text-danger focus:ring-danger"
                        />
                        <span className="text-xs font-semibold text-danger">
                          Delete all projects created by me in this organization{ownedProjects.length > 0 ? ` (${ownedProjects.length})` : ''} along with their repositories, knowledge, and history
                        </span>
                      </label>
                    </div>
                  )}

                  <div className="mt-6 flex flex-wrap justify-end gap-2">
                    <Button variant="outline" disabled={busy === 'leave'} onClick={() => leaveDialog.current?.close()}>Cancel</Button>
                    <Button
                      variant="danger"
                      isLoading={busy === 'leave'}
                      disabled={(ownedProjects.length > 0 || Boolean(leaveError?.toLowerCase().includes('owns projects'))) && !deleteOwnedOnLeave}
                      title={(ownedProjects.length > 0 || Boolean(leaveError?.toLowerCase().includes('owns projects'))) && !deleteOwnedOnLeave ? 'Check the box to delete your projects or transfer ownership before leaving' : undefined}
                      onClick={() => void leave()}
                    >
                      Leave organization
                    </Button>
                  </div>
                </dialog>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </PageContainer>
  )
}
