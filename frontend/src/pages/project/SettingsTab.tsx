import { Trash2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
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

  const [name, setName] = useState(project.name)
  const [description, setDescription] = useState(project.description ?? '')
  const [newRepo, setNewRepo] = useState('')
  const [newMember, setNewMember] = useState('')
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  const orgMembers = useAsync(() => (isOwner ? orgApi.get(project.orgId).then((d) => d.members) : Promise.resolve([])), [isOwner, project.orgId])
  const candidates = (orgMembers.data ?? []).filter((m) => !members.some((pm) => pm.userId === m.userId))

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
  const addMember = (e: FormEvent) => { e.preventDefault(); void act('member', async () => { await projectApi.addMember(project.id, Number(newMember)); setNewMember('') }, 'Contributor added') }

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
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Settings</h2>
      {!isOwner && <Alert tone="info">Only project owners can change settings. You can view them here.</Alert>}
      {msg && <Alert tone={msg.ok ? 'success' : 'error'}>{msg.text}</Alert>}

      <Card>
        <CardHeader><CardTitle>Details</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={saveDetails} className="space-y-4">
            <Input label="Name" value={name} maxLength={120} disabled={!isOwner} onChange={(e) => setName(e.target.value)} />
            <Textarea label="Description" rows={3} value={description} maxLength={2000} disabled={!isOwner} onChange={(e) => setDescription(e.target.value)} />
            {isOwner && <Button type="submit" isLoading={busy === 'details'} disabled={!name.trim()}>Save</Button>}
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Repositories</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <ul className="divide-y divide-surface-border">
            {repositories.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                <span className="truncate">{r.owner}/{r.name}</span>
                <div className="flex items-center gap-2">
                  <Badge variant={syncTone(r.syncStatus)}>{r.syncStatus}</Badge>
                  {isOwner && <Button variant="ghost" size="sm" aria-label={`Remove ${r.name}`} disabled={busy === `r${r.id}`} onClick={() => void act(`r${r.id}`, () => projectApi.removeRepository(project.id, r.id), 'Repository removed')}><Trash2 size={16} aria-hidden /></Button>}
                </div>
              </li>
            ))}
            {repositories.length === 0 && <li className="py-2 text-sm text-text-muted">No repositories connected.</li>}
          </ul>
          {isOwner && (
            <form onSubmit={addRepo} className="flex items-end gap-2">
              <Input label="Add repository" placeholder="https://github.com/owner/repo" value={newRepo} onChange={(e) => setNewRepo(e.target.value)} />
              <Button type="submit" isLoading={busy === 'repo'} disabled={!newRepo.trim()}>Add</Button>
            </form>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Members</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <ul className="divide-y divide-surface-border">
            {members.map((m) => (
              <li key={m.userId} className="flex items-center justify-between gap-2 py-2 text-sm">
                <div><p className="font-medium">{m.name}{m.userId === user?.id && ' (you)'}</p><p className="text-text-muted">{m.email}</p></div>
                <div className="flex items-center gap-2">
                  <Badge variant={m.role === 'owner' ? 'primary' : 'default'}>{m.role}</Badge>
                  {isOwner && m.role !== 'owner' && <Button variant="ghost" size="sm" aria-label={`Remove ${m.name}`} disabled={busy === `m${m.userId}`} onClick={() => void act(`m${m.userId}`, () => projectApi.removeMember(project.id, m.userId), 'Contributor removed')}><Trash2 size={16} aria-hidden /></Button>}
                </div>
              </li>
            ))}
          </ul>
          {isOwner && (
            <form onSubmit={addMember} className="flex items-end gap-2">
              <div className="w-full space-y-1.5">
                <label htmlFor="add-member" className="block text-sm font-medium">Add contributor</label>
                <select id="add-member" value={newMember} onChange={(e) => setNewMember(e.target.value)} className="h-10 w-full rounded-lg border border-surface-border bg-surface-card px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-indigo">
                  <option value="">Select a teammate...</option>
                  {candidates.map((m) => <option key={m.userId} value={m.userId}>{m.name} ({m.email})</option>)}
                </select>
              </div>
              <Button type="submit" isLoading={busy === 'member'} disabled={!newMember}>Add</Button>
            </form>
          )}
        </CardContent>
      </Card>

      {isOwner && (
        <Card className="border-red-200">
          <CardHeader><CardTitle className="text-danger">Danger zone</CardTitle></CardHeader>
          <CardContent>
            <p className="mb-4 text-sm text-text-secondary">Deleting a project removes its repositories, knowledge and history from PRISM. Your GitHub repositories are not affected.</p>
            <Button variant="danger" isLoading={busy === 'delete'} onClick={() => void remove()}>Delete project</Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
