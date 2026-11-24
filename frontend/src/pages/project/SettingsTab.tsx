import { Trash2 } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { orgApi, projectApi } from '../../api/endpoints'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card'
import { Input, Textarea } from '../../components/ui/Input'
import { Alert } from '../../components/ui/States'
import { useAuth } from '../../context/AuthContext'
import { useAsync } from '../../hooks/useAsync'
import { useProject } from '../../hooks/useProject'
import { errorMessage } from '../../lib/format'
import { syncTone } from '../../lib/tones'

export default function SettingsTab() {
  const { detail, reload } = useProject()
  const { project, repositories, members } = detail
  const { user } = useAuth()
  const navigate = useNavigate()
  const isOwner = project.role === 'owner'
  const teamProject = project.orgType === 'TEAM'
  const { hash } = useLocation()
  useEffect(() => {
    if (['#repositories', '#ownership', '#details', '#members', '#danger'].includes(hash)) {
      document.getElementById(hash.slice(1))?.scrollIntoView({ block: 'start' })
    }
  }, [hash])

  const [name, setName] = useState(project.name)
  const [description, setDescription] = useState(project.description ?? '')
  const [newRepo, setNewRepo] = useState('')
  const [successor, setSuccessor] = useState('')
  const [newMember, setNewMember] = useState('')
  const [memberRole, setMemberRole] = useState<'contributor' | 'viewer'>('contributor')
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  const orgMembers = useAsync(() => (isOwner && teamProject ? orgApi.get(project.orgId).then((d) => d.members) : Promise.resolve([])), [isOwner, teamProject, project.orgId])
  const candidates = (orgMembers.data ?? []).filter((m) => !members.some((pm) => pm.userId === m.userId))
  const unchanged = name.trim() === project.name && description.trim() === (project.description ?? '')

  const act = async (key: string, fn: () => Promise<unknown>, success: string) => {
    setBusy(key)
    setMsg(null)
    try {
      await fn()
      setMsg({ ok: true, text: success })
      reload()
    } catch (err) {
      setMsg({ ok: false, text: errorMessage(err) })
    } finally {
      setBusy(null)
    }
  }

  const saveDetails = (e: FormEvent) => { e.preventDefault(); void act('details', () => projectApi.update(project.id, name.trim(), description.trim()), 'Project updated') }
  const addRepo = (e: FormEvent) => { e.preventDefault(); void act('repo', async () => { await projectApi.addRepository(project.id, newRepo.trim()); setNewRepo('') }, 'Repository added and queued for sync') }
  const addMember = (e: FormEvent) => { e.preventDefault(); void act('member', async () => { await projectApi.addMember(project.id, Number(newMember), memberRole); setNewMember('') }, 'Member added') }

  const remove = async () => {
    if (!window.confirm(`Delete "${project.name}" and all its knowledge? This cannot be undone.`)) return
    setBusy('delete')
    try {
      await projectApi.remove(project.id)
      navigate('/app/projects', { replace: true })
    } catch (err) {
      setMsg({ ok: false, text: errorMessage(err) })
      setBusy(null)
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <h2 className="text-xl sm:text-2xl font-bold">Settings</h2>
      <nav aria-label="Project settings sections" className="flex flex-wrap gap-2 text-sm">
        {[
          ['details', 'Details'],
          ['repositories', 'Repositories'],
          ...(teamProject ? [['members', 'Members']] : []),
          ...(teamProject && isOwner ? [['ownership', 'Ownership']] : []),
          ...(isOwner ? [['danger', 'Danger zone']] : []),
        ].map(([section, label]) => <a key={section} href={`#${section}`} onClick={(event) => {
          event.preventDefault()
          document.getElementById(section)?.scrollIntoView({ block: 'start' })
        }} className="rounded-md border border-surface-border bg-surface-card px-3 py-1.5 font-medium text-text-secondary hover:text-primary-indigo">
          {label}
        </a>)}
      </nav>
      {!isOwner && <Alert tone="info">Only project owners can change settings. You can view them here.</Alert>}
      {msg && <Alert tone={msg.ok ? 'success' : 'error'}>{msg.text}</Alert>}

      <Card id="details" className="scroll-mt-20">
        <CardHeader><CardTitle>Details</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={saveDetails} className="space-y-4">
            <Input label="Name" value={name} maxLength={120} disabled={!isOwner} onChange={(e) => setName(e.target.value)} />
            <Textarea label="Description" rows={3} value={description} maxLength={2000} disabled={!isOwner} onChange={(e) => setDescription(e.target.value)} />
            {isOwner && <Button type="submit" isLoading={busy === 'details'} disabled={!name.trim() || unchanged} className="w-full sm:w-auto">Save changes</Button>}
          </form>
        </CardContent>
      </Card>

      <Card id="repositories" className="scroll-mt-20">
        <CardHeader><CardTitle>Repositories</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <ul className="divide-y divide-surface-border">
            {repositories.map((r) => (
              <li key={r.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-3 text-sm">
                <span className="truncate font-medium">{r.owner}/{r.name}</span>
                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <Badge variant={syncTone(r.syncStatus)}>{r.syncStatus}</Badge>
                  {isOwner && <Button variant="ghost" size="sm" aria-label={`Remove ${r.name}`} disabled={busy === `r${r.id}`} onClick={() => void act(`r${r.id}`, () => projectApi.removeRepository(project.id, r.id), 'Repository removed')}><Trash2 size={16} aria-hidden /></Button>}
                </div>
              </li>
            ))}
            {repositories.length === 0 && <li className="py-2 text-sm text-text-muted">No repositories connected.</li>}
          </ul>
          {isOwner && (
            <form onSubmit={addRepo} className="flex flex-col sm:flex-row items-stretch sm:items-end gap-2 pt-2">
              <div className="flex-1">
                <Input label="Add repository" placeholder="https://github.com/owner/repo" value={newRepo} onChange={(e) => setNewRepo(e.target.value)} />
              </div>
              <Button type="submit" isLoading={busy === 'repo'} disabled={!newRepo.trim()} className="h-10 sm:h-9">Add</Button>
            </form>
          )}
        </CardContent>
      </Card>

      {teamProject && <Card id="members" className="scroll-mt-20">
        <CardHeader><CardTitle>Members</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <ul className="divide-y divide-surface-border">
            {members.map((m) => (
              <li key={m.userId} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-3 text-sm">
                <div><p className="font-medium">{m.name}{m.userId === user?.id && ' (you)'}</p><p className="text-xs text-text-muted">{m.email}</p></div>
                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <Badge variant={m.role === 'owner' ? 'primary' : 'default'}>{m.role}</Badge>
                  {isOwner && m.role !== 'owner' && <Button variant="ghost" size="sm" aria-label={`Remove ${m.name}`} disabled={busy === `m${m.userId}`} onClick={() => void act(`m${m.userId}`, () => projectApi.removeMember(project.id, m.userId), 'Contributor removed')}><Trash2 size={16} aria-hidden /></Button>}
                </div>
              </li>
            ))}
          </ul>
          {orgMembers.error && <Alert>{orgMembers.error} <Button variant="outline" size="sm" onClick={orgMembers.reload}>Try again</Button></Alert>}
          {isOwner && !orgMembers.loading && !orgMembers.error && !candidates.length && <p className="text-sm text-text-secondary">There are no other organization members to add. Teammates can join with an organization invite code.</p>}
          {isOwner && candidates.length > 0 && (
            <form onSubmit={addMember} className="flex flex-col sm:flex-row items-stretch sm:items-end gap-2 pt-2">
              <div className="w-full flex-1 space-y-1.5">
                <label htmlFor="add-member" className="block text-sm font-medium">Add contributor</label>
                <select id="add-member" value={newMember} onChange={(e) => setNewMember(e.target.value)} className="h-10 w-full rounded-xl border border-surface-border bg-surface-card px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-indigo">
                  <option value="">Select a teammate...</option>
                  {candidates.map((m) => <option key={m.userId} value={m.userId}>{m.name} ({m.email})</option>)}
                </select>
              </div>
              <select aria-label="Project role" value={memberRole} onChange={(e) => setMemberRole(e.target.value === 'viewer' ? 'viewer' : 'contributor')} className="h-10 rounded-xl border border-surface-border bg-surface-card px-3 text-sm">
                <option value="contributor">Contributor</option>
                <option value="viewer">Viewer</option>
              </select>
              <Button type="submit" isLoading={busy === 'member'} disabled={!newMember} className="h-10">Add</Button>
            </form>
          )}
        </CardContent>
      </Card>}

      {teamProject && isOwner && (
        <Card id="ownership" className="scroll-mt-20">
          <CardHeader><CardTitle>Transfer project ownership</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p>Choose a project member to take ownership. You’ll remain a contributor.</p>
            <select aria-label="New project owner" value={successor} onChange={(event) => setSuccessor(event.target.value)} className="w-full rounded-lg border border-surface-border bg-surface-card p-2">
              <option value="">Select a project member</option>
              {members.filter((member) => member.userId !== user?.id).map((member) => <option key={member.userId} value={member.userId}>{member.name}</option>)}
            </select>
            <Button variant="outline" disabled={!successor || busy !== null} isLoading={busy === 'transfer'} onClick={() =>
              void act('transfer', () => projectApi.transferOwnership(project.id, Number(successor)), 'Project ownership transferred')}>
              Transfer ownership
            </Button>
          </CardContent>
        </Card>
      )}

      {isOwner && (
        <Card id="danger" className="scroll-mt-20 border-red-200">
          <CardHeader><CardTitle className="text-danger">Danger zone</CardTitle></CardHeader>
          <CardContent>
            <p className="mb-4 text-xs sm:text-sm text-text-secondary">Deleting a project removes its repositories, knowledge and history from PRISM. Your GitHub repositories are not affected.</p>
            <Button variant="danger" isLoading={busy === 'delete'} onClick={() => void remove()}>Delete project</Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
