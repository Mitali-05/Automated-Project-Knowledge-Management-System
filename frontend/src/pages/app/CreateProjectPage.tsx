import { Plus, Trash2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { ApiError } from '../../api/client'
import { githubApi, orgApi, projectApi } from '../../api/endpoints'
import { PageContainer, PageHeader } from '../../components/layout/PageContainer'
import { Button } from '../../components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card'
import { Input, Textarea } from '../../components/ui/Input'
import { Alert, ErrorState } from '../../components/ui/States'
import { useAuth } from '../../context/AuthContext'
import { useOrgs } from '../../context/OrgContext'
import { useAsync } from '../../hooks/useAsync'
import { errorMessage } from '../../lib/format'

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value]
}

export default function CreateProjectPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { orgs, activeOrg, setActiveOrgId } = useOrgs()
  const [pickedOrg, setPickedOrg] = useState<number | null>(null)
  const orgId = pickedOrg ?? activeOrg?.id ?? null
  const org = orgs.find((o) => o.id === orgId) ?? null
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [urls, setUrls] = useState<string[]>([''])
  const [pickedRepos, setPickedRepos] = useState<string[]>([])
  const [contributors, setContributors] = useState<number[]>([])
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)

  const members = useAsync(() => (orgId ? orgApi.get(orgId).then((d) => d.members) : Promise.resolve([])), [orgId])
  const github = useAsync(async () => {
    if (!orgId) return null
    const status = await githubApi.status(orgId)
    const repos = status.connected ? await githubApi.repositories(orgId) : []
    return { status, repos }
  }, [orgId])

  const teammates = (members.data ?? []).filter((m) => m.userId !== user?.id)

  const changeOrg = (id: number) => {
    setPickedOrg(id)
    setActiveOrgId(id)
    setContributors([])
    setPickedRepos([])
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setFieldErrors({})
    if (!orgId) return setError('Choose an organization for this project.')
    const normalized = urls.map((url) => url.trim()).filter(Boolean).map((url) => {
      const match = /^(?:https?:\/\/github\.com\/|github\.com\/)?([a-z0-9-]+)\/([a-z0-9_.-]+?)\/?$/i.exec(url)
      if (!match) return null
      const repo = match[2].replace(/\.git$/i, '')
      return repo && repo !== '.' && repo !== '..' ? `https://github.com/${match[1]}/${repo}` : null
    })
    if (normalized.some((url) => url === null)) return setError('Enter a GitHub repository as owner/repo or https://github.com/owner/repo.')
    const repositoryUrls = [...new Set([...normalized.filter((url): url is string => url !== null), ...pickedRepos])]
    setBusy(true)
    try {
      const created = await projectApi.create({ orgId, name: name.trim(), description: description.trim() || undefined, repositoryUrls, contributorIds: contributors })
      navigate(`/app/projects/${created.project.id}`, { replace: true })
    } catch (err) {
      if (err instanceof ApiError) setFieldErrors(err.fieldErrors)
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <PageContainer narrow>
      <PageHeader title="Create project" subtitle="A project can combine several repositories." />
      <form onSubmit={onSubmit} className="space-y-6" noValidate>
        {error && <Alert>{error}</Alert>}

        <Card><CardContent className="space-y-4 p-4 sm:p-6">
          <div className="w-full space-y-1.5">
            <label htmlFor="project-org" className="block text-sm font-medium text-text-primary">Organization<span className="ml-1 text-danger">*</span></label>
            <select id="project-org" value={orgId ?? ''} onChange={(e) => changeOrg(Number(e.target.value))}
              className="h-10 w-full rounded-xl border border-surface-border bg-surface-card px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-indigo">
              {orgs.map((o) => <option key={o.id} value={o.id}>{o.name}{o.type === 'PERSONAL' ? ' (personal)' : ''}</option>)}
            </select>
            <p className="text-xs text-text-muted">The project, its contributors and its GitHub connection all belong to this organization.</p>
          </div>
          <Input label="Project name" required value={name} maxLength={120} onChange={(e) => setName(e.target.value)} error={fieldErrors.name} />
          <Textarea label="Description" rows={3} value={description} maxLength={2000} onChange={(e) => setDescription(e.target.value)} error={fieldErrors.description} />
        </CardContent></Card>

        <Card>
          <CardHeader><CardTitle>GitHub repositories</CardTitle></CardHeader>
          <CardContent className="space-y-4 p-4 sm:p-6">
            {github.error && <ErrorState message={github.error} onRetry={github.reload} />}
            {urls.map((url, i) => (
              <div key={i} className="flex flex-col sm:flex-row sm:items-end gap-2">
                <div className="flex-1">
                  <Input label={`Repository link ${i + 1}`} placeholder="https://github.com/owner/repo" value={url} onChange={(e) => setUrls(urls.map((u, j) => (j === i ? e.target.value : u)))} />
                </div>
                {urls.length > 1 && (
                  <Button variant="ghost" aria-label="Remove repository" onClick={() => setUrls(urls.filter((_, j) => j !== i))} className="self-end sm:self-auto h-10 w-10 p-0 shrink-0">
                    <Trash2 size={16} aria-hidden />
                  </Button>
                )}
              </div>
            ))}
            {fieldErrors.repositoryUrls && <p className="text-xs text-danger">{fieldErrors.repositoryUrls}</p>}
            <Button variant="outline" size="sm" onClick={() => setUrls([...urls, ''])} disabled={urls.length >= 20}><Plus size={15} aria-hidden /> Add another repository</Button>

            {github.data?.status.configured && !github.data.status.connected && github.data.status.installUrl && (
              <Alert tone="info">Public repositories can be read directly. For private repositories, <a className="font-semibold underline" href={github.data.status.installUrl}>Connect the PRISM GitHub App</a> for {org?.name ?? 'this organization'}.</Alert>
            )}
            {github.data?.status.configured && !github.data.status.connected && !github.data.status.canManage && (
              <p className="text-xs text-text-muted">Private repositories need GitHub connected for this organization. Ask an owner or admin to connect it.</p>
            )}
            {github.data && github.data.repos.length > 0 && (
              <fieldset className="pt-2">
                <legend className="mb-2 text-sm font-medium">Or pick from {org?.name}'s connected GitHub installation</legend>
                <div className="max-h-56 space-y-1 overflow-y-auto rounded-xl border border-surface-border p-2">
                  {github.data.repos.map((r) => (
                    <label key={r.id} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-xs sm:text-sm hover:bg-primary-light-indigo/50">
                      <input type="checkbox" checked={pickedRepos.includes(r.url)} onChange={() => setPickedRepos(toggle(pickedRepos, r.url))} />
                      <span className="truncate">{r.fullName}</span>
                      {r.isPrivate && <span className="text-[10px] uppercase text-text-muted ml-auto shrink-0">private</span>}
                    </label>
                  ))}
                </div>
              </fieldset>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Contributors</CardTitle></CardHeader>
          <CardContent className="space-y-1 p-4 sm:p-6">
            {members.error && <p className="text-sm text-danger">{members.error}</p>}
            {!members.loading && teammates.length === 0 && (
              <p className="text-xs sm:text-sm text-text-muted">
                {org?.type === 'PERSONAL'
                  ? 'A personal workspace has only you. Create an organization to work with a team.'
                  : 'No teammates in this organization yet. Share its invite code from the Organizations page; you can add contributors later in project settings.'}
              </p>
            )}
            {teammates.map((m) => (
              <label key={m.userId} className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs sm:text-sm hover:bg-primary-light-indigo/50">
                <input type="checkbox" checked={contributors.includes(m.userId)} onChange={() => setContributors(toggle(contributors, m.userId))} />
                <span className="font-medium text-text-primary">{m.name}</span>
                <span className="text-xs text-text-muted truncate">({m.email})</span>
              </label>
            ))}
          </CardContent>
        </Card>

        <Button type="submit" isLoading={busy} className="h-11 w-full text-base shadow-lg shadow-primary-indigo/30">Create Project</Button>
      </form>
    </PageContainer>
  )
}
