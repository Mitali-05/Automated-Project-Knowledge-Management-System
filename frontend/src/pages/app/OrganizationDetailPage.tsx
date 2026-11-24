import { useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Check, Copy, ExternalLink, GitBranch, LogOut, Plus, RefreshCw, Trash2 } from 'lucide-react'
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
import { projectSyncLabel, syncTone } from '../../lib/tones'

export default function OrganizationDetailPage() {
  const { orgId } = useParams()
  const id = Number(orgId)
  const navigate = useNavigate()
  const { user } = useAuth()
  const { refresh } = useOrgs()
  const detail = useAsync(() => orgApi.get(id), [id])
  const github = useAsync(() => githubApi.status(id), [id])
  const personalWorkspace = detail.data?.organization.type === 'PERSONAL'
  const projects = useAsync(async () =>
    personalWorkspace ? (await projectApi.list()).filter((project) => project.orgId === id) : [], [id, personalWorkspace])
  const connected = personalWorkspace && github.data?.connected === true
  const repositories = useAsync(() => connected ? githubApi.repositories(id) : Promise.resolve([]), [id, connected])
  const [name, setName] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const [leaveError, setLeaveError] = useState<string | null>(null)
  const [ownedProjects, setOwnedProjects] = useState<{ id: number; name: string }[]>([])
  const [checkingOwnership, setCheckingOwnership] = useState(false)
  const [successor, setSuccessor] = useState('')
  const leaveCheck = useRef(0)
  const leaveDialog = useRef<HTMLDialogElement>(null)
  const disconnectDialog = useRef<HTMLDialogElement>(null)
  const [disconnectError, setDisconnectError] = useState<string | null>(null)

  const [deleteOrgError, setDeleteOrgError] = useState<string | null>(null)
  const [deleteAllProjectsOnDelete, setDeleteAllProjectsOnDelete] = useState(false)
  const deleteOrgDialog = useRef<HTMLDialogElement>(null)

  if (detail.loading && !detail.data) return <PageContainer narrow><LoadingState rows={3} label="Loading workspace settings…" /></PageContainer>
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
      void refresh().catch(() => undefined)
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

  const loadLeaveBlockers = async () => {
    const check = ++leaveCheck.current
    setCheckingOwnership(true)
    try {
      const blockers = await orgApi.leaveBlockers(id)
      if (check === leaveCheck.current) setOwnedProjects(blockers)
    } catch {
      // The leave endpoint still enforces ownership when an older backend lacks the read endpoint.
    } finally {
      if (check === leaveCheck.current) setCheckingOwnership(false)
    }
  }

  const openLeaveDialog = () => {
    setLeaveError(null)
    setOwnedProjects([])
    leaveDialog.current?.showModal()
    void loadLeaveBlockers()
  }

  const leave = async () => {
    setBusy('leave')
    setLeaveError(null)
    try {
      await orgApi.leave(id)
      leaveDialog.current?.close()
      void refresh().catch(() => undefined)
      navigate('/app/organizations', { replace: true })
    } catch (err) {
      setLeaveError(errorMessage(err))
      void loadLeaveBlockers()
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
  const newProjectUrl = `/app/projects/new?orgId=${id}`
  const disconnectGitHub = async () => {
    setBusy('disconnect')
    setDisconnectError(null)
    try {
      await githubApi.disconnect(id)
      disconnectDialog.current?.close()
      github.reload()
      detail.reload()
      void refresh().catch(() => undefined)
      setMsg({ ok: true, text: 'GitHub disconnected from this workspace.' })
    } catch (err) {
      setDisconnectError(errorMessage(err))
    } finally {
      setBusy(null)
    }
  }

  return (
    <PageContainer narrow>
      <Link to="/app/organizations" className="inline-flex items-center gap-1 text-xs sm:text-sm text-text-secondary hover:text-primary-indigo"><ArrowLeft size={14} aria-hidden /> All organizations</Link>
      <PageHeader title={org.name} subtitle={personal ? 'Personal workspace settings' : `${org.memberCount} member${org.memberCount === 1 ? '' : 's'} · created ${formatDate(org.createdAt)}`}
        action={<div className="flex flex-wrap items-center gap-3">
          <RoleBadge role={org.role} />
          {personal && <Link to={newProjectUrl} className="inline-flex items-center gap-2 rounded-lg bg-primary-indigo px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-blue"><Plus size={16} aria-hidden /> New project</Link>}
        </div>} />

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
          <CardTitle className="flex items-center gap-2"><GitBranch size={17} className="text-primary-indigo" aria-hidden /> GitHub connection</CardTitle>
          <Badge variant={(gh?.connected ?? org.githubConnected) ? 'success' : 'default'}>{(gh?.connected ?? org.githubConnected) ? 'Connected' : 'Not connected'}</Badge>
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
          {github.error && <Alert>{github.error} <Button variant="outline" size="sm" onClick={github.reload}>Try again</Button></Alert>}
          {connected && (
            <>
              {repositories.loading && !repositories.data && <p role="status">Checking repository access…</p>}
              {repositories.error && <Alert>{repositories.error} <Button variant="outline" size="sm" onClick={repositories.reload}>Try again</Button></Alert>}
              {repositories.data?.length === 0 && <p>No repositories granted. Review the app’s access on GitHub.</p>}
              {!!repositories.data?.length && <details className="rounded-lg border border-surface-border p-3">
                <summary className="cursor-pointer font-medium">Available repositories ({repositories.data.length})</summary>
                <ul className="mt-2 max-h-56 space-y-2 overflow-y-auto">
                  {repositories.data.map((repo) => <li key={repo.id} className="flex flex-wrap items-center gap-2">
                    <a href={repo.url} target="_blank" rel="noopener noreferrer" className="break-all text-primary-indigo underline">{repo.fullName}</a>
                    {repo.isPrivate && <Badge>Private</Badge>}
                  </li>)}
                </ul>
              </details>}
              <div className="flex flex-wrap items-center gap-3 border-t border-surface-border pt-3">
                <a href="https://github.com/settings/installations" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-medium text-primary-indigo underline">Manage access on GitHub <ExternalLink size={14} aria-hidden /></a>
                <Button variant="outline" size="sm" disabled={repositories.loading} onClick={repositories.reload}><RefreshCw size={14} aria-hidden /> Refresh access</Button>
                {gh?.canManage && <Button variant="ghost" size="sm" className="text-danger" disabled={busy !== null} onClick={() => {
                  setDisconnectError(null)
                  disconnectDialog.current?.showModal()
                }}>Disconnect</Button>}
              </div>
            </>
          )}
          {!gh?.connected && gh?.configured && !gh.canManage && <Alert tone="info">Ask a workspace owner or admin to connect GitHub.</Alert>}
          {personal && <dialog ref={disconnectDialog} aria-labelledby="disconnect-github-title"
            onCancel={(event) => { if (busy === 'disconnect') event.preventDefault() }}
            className="m-auto w-[calc(100%-2rem)] max-w-md rounded-xl border border-surface-border bg-surface-card p-6 text-text-primary shadow-xl backdrop:bg-black/50">
            <h2 id="disconnect-github-title" className="text-lg font-semibold">Disconnect GitHub?</h2>
            <p className="mt-2 text-sm text-text-secondary">Private repositories in this workspace may stop syncing until you reconnect. Existing projects and knowledge stay in PRISM.</p>
            {disconnectError && <div className="mt-3"><Alert>{disconnectError}</Alert></div>}
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <Button variant="outline" disabled={busy === 'disconnect'} onClick={() => disconnectDialog.current?.close()}>Cancel</Button>
              <Button variant="danger" isLoading={busy === 'disconnect'} onClick={() => void disconnectGitHub()}>Disconnect GitHub</Button>
            </div>
          </dialog>}
        </CardContent>
      </Card>

      {personal && (
        <Card>
          <CardHeader className="flex-row flex-wrap items-center justify-between gap-2 space-y-0">
            <CardTitle>Workspace projects</CardTitle>
            <Badge>{projects.data ? `${projects.data.length} ${projects.data.length === 1 ? 'project' : 'projects'}` : 'Personal'}</Badge>
          </CardHeader>
          <CardContent className="text-sm">
            {projects.loading && !projects.data && <LoadingState rows={1} label="Loading workspace projects…" />}
            {projects.error && <ErrorState message={projects.error} onRetry={projects.reload} />}
            {!projects.loading && !projects.error && projects.data?.length === 0 && <div className="rounded-lg border border-dashed border-surface-border p-4">
              <p className="font-semibold">No projects yet</p>
              <p className="mt-1 text-text-secondary">Link a repository to start collecting project knowledge.</p>
              <Link to={newProjectUrl} className="mt-3 inline-block font-medium text-primary-indigo underline">Create your first project</Link>
            </div>}
            {!!projects.data?.length && <ul className="divide-y divide-surface-border">
              {projects.data.map((project) => <li key={project.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <Link to={`/app/projects/${project.id}`} className="font-medium text-primary-indigo underline">{project.name}</Link>
                <Badge variant={syncTone(projectSyncLabel(project))}>{projectSyncLabel(project)}</Badge>
              </li>)}
            </ul>}
          </CardContent>
        </Card>
      )}

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

      {isOwner && (
        <Card>
          <CardHeader><CardTitle>{personal ? 'Workspace name' : 'Rename organization'}</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={rename} className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <Input aria-label={personal ? "Workspace name" : "Organization name"} value={name ?? org.name} onChange={(e) => setName(e.target.value)} maxLength={150} />
              </div>
              <Button type="submit" isLoading={busy === 'rename'} disabled={!name || name.trim() === org.name}>Save</Button>
            </form>
          </CardContent>
        </Card>
      )}

      {!personal && isOwner && (
        <Card>
          <CardHeader><CardTitle>Transfer organization ownership</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p>Choose a current member. They become the owner, and you become an admin.</p>
            <select aria-label="New organization owner" value={successor} onChange={(event) => setSuccessor(event.target.value)} className="w-full rounded-lg border border-surface-border bg-surface-card p-2">
              <option value="">Select a member</option>
              {members.filter((member) => member.userId !== user?.id && member.role !== 'owner').map((member) =>
                <option key={member.userId} value={member.userId}>{member.name}</option>)}
            </select>
            <Button variant="outline" disabled={!successor || busy !== null} isLoading={busy === 'transfer'} onClick={() =>
              void act('transfer', () => orgApi.transferOwnership(id, Number(successor)), 'Organization ownership transferred')}>
              Transfer ownership
            </Button>
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

                  {checkingOwnership && <p className="mt-4 text-sm text-text-secondary" role="status">Checking project ownership…</p>}
                  {ownedProjects.length > 0 && (
                    <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
                      <p className="font-semibold">Transfer these projects before leaving</p>
                      <ul className="mt-2 space-y-2">
                        {ownedProjects.map((project) => (
                          <li key={project.id}>
                            <Link to={`/app/projects/${project.id}/settings#ownership`} className="text-primary-indigo underline">
                              {project.name}
                            </Link>
                          </li>
                        ))}
                      </ul>
                      <Button variant="outline" size="sm" className="mt-3" disabled={checkingOwnership} onClick={() => void loadLeaveBlockers()}>Check again</Button>
                    </div>
                  )}

                  <div className="mt-6 flex flex-wrap justify-end gap-2">
                    <Button variant="outline" disabled={busy === 'leave'} onClick={() => leaveDialog.current?.close()}>Cancel</Button>
                    <Button
                      variant="danger"
                      isLoading={busy === 'leave'}
                      disabled={checkingOwnership || ownedProjects.length > 0}
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
