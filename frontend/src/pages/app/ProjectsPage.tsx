import { useMemo, useState } from 'react'
import { FolderGit2, LayoutGrid, List, Plus, Search } from 'lucide-react'
import { motion } from 'framer-motion'
import { Link, useSearchParams } from 'react-router-dom'
import type { ProjectSummary } from '../../api/types'
import { projectApi } from '../../api/endpoints'
import { PageContainer, PageHeader } from '../../components/layout/PageContainer'
import { ProjectCard } from '../../components/ProjectCard'
import { ProjectRow } from '../../components/ProjectRow'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { EmptyState, ErrorState } from '../../components/ui/States'
import { Skeleton } from '../../components/ui/Skeleton'
import { useOrgs } from '../../context/OrgContext'
import { useAsync } from '../../hooks/useAsync'
import { cn } from '../../lib/cn'
import { syncTone } from '../../lib/tones'

type Sort = 'updated' | 'name' | 'knowledge' | 'synced'
type View = 'grid' | 'list'
const VIEW_KEY = 'prism.projectsView'

const sorters: Record<Sort, (a: ProjectSummary, b: ProjectSummary) => number> = {
  updated: (a, b) => b.updatedAt.localeCompare(a.updatedAt),
  name: (a, b) => a.name.localeCompare(b.name),
  knowledge: (a, b) => b.knowledgeItemCount - a.knowledgeItemCount,
  synced: (a, b) => (b.lastSyncedAt ?? '').localeCompare(a.lastSyncedAt ?? ''),
}

const select = 'h-10 sm:h-9 rounded-xl border border-surface-border bg-surface-card px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-indigo'

function readView(): View {
  try {
    return localStorage.getItem(VIEW_KEY) === 'list' ? 'list' : 'grid'
  } catch {
    return 'grid'
  }
}

function Group({ title, count, projects, view }: { title: string; count?: number; projects: ProjectSummary[]; view: View }) {
  if (projects.length === 0) return null
  return (
    <section aria-label={title}>
      <h2 className="mb-4 flex items-center gap-2 text-lg font-bold">{title}<span className="text-sm font-normal text-text-muted">{count ?? projects.length}</span></h2>
      {view === 'grid' ? (
        <div className="grid grid-cols-1 gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p, i) => (
            <motion.div key={p.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: Math.min(i, 8) * 0.05 }}><ProjectCard project={p} /></motion.div>
          ))}
        </div>
      ) : (
        <Card className="divide-y divide-surface-border overflow-hidden">{projects.map((p) => <ProjectRow key={p.id} project={p} />)}</Card>
      )}
    </section>
  )
}

export default function ProjectsPage() {
  const [params, setParams] = useSearchParams()
  const { activeOrg } = useOrgs()
  const { data, loading, error, reload } = useAsync(() => projectApi.list(), [])
  const [view, setViewState] = useState<View>(readView)

  const q = params.get('q') ?? ''
  const statusFilter = params.get('status') ?? ''
  const roleFilter = params.get('role') ?? ''
  const sort = (params.get('sort') as Sort | null) ?? 'updated'

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    setParams(next, { replace: true })
  }
  const setView = (v: View) => {
    setViewState(v)
    try {
      localStorage.setItem(VIEW_KEY, v)
    } catch {
    }
  }

  const all = useMemo(() => (data ?? []).filter((p) => !activeOrg || p.orgId === activeOrg.id), [data, activeOrg])
  const overview = useMemo(() => ({
    total: all.length,
    synced: all.filter((p) => p.syncStatus === 'Synced').length,
    failed: all.filter((p) => p.syncStatus === 'Failed').length,
    pending: all.filter((p) => p.syncStatus === 'Pending' || p.syncStatus === 'Syncing').length,
  }), [all])

  const filtering = Boolean(q.trim() || statusFilter || roleFilter)
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return all
      .filter((p) => !needle || `${p.name} ${p.description ?? ''} ${p.orgName}`.toLowerCase().includes(needle))
      .filter((p) => !statusFilter || p.syncStatus === statusFilter)
      .filter((p) => !roleFilter || p.role === roleFilter)
      .sort(sorters[sort] ?? sorters.updated)
  }, [all, q, statusFilter, roleFilter, sort])

  const recent = useMemo(() => [...all].sort(sorters.updated).slice(0, 4), [all])
  const mine = filtered.filter((p) => p.role === 'owner')
  const shared = filtered.filter((p) => p.role === 'contributor')

  const tiles = [
    { label: 'Total', value: overview.total, tone: 'text-text-primary' },
    { label: 'Synced', value: overview.synced, tone: 'text-emerald-600' },
    { label: 'Failed', value: overview.failed, tone: overview.failed ? 'text-red-600' : 'text-text-primary' },
    { label: 'Pending / syncing', value: overview.pending, tone: 'text-amber-600' },
  ]

  return (
    <PageContainer>
      <PageHeader title="Projects" subtitle={activeOrg ? `Projects in ${activeOrg.type === 'PERSONAL' ? 'your personal workspace' : activeOrg.name}. Switch organizations from the sidebar.` : 'Every project you own or contribute to.'}
        action={<Link to="/app/projects/new"><Button className="w-full sm:w-auto gap-2 shadow-lg shadow-primary-indigo/20"><Plus size={18} aria-hidden /> New Project</Button></Link>} />

      {loading && !data ? (
        <div className="grid grid-cols-1 gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-[200px] w-full rounded-2xl" />)}</div>
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : all.length === 0 ? (
        <EmptyState icon={<FolderGit2 size={40} />} title="No projects yet"
          description="Get started by creating your first project and extracting knowledge from your GitHub repositories."
          action={<Link to="/app/projects/new"><Button className="px-8">Create First Project</Button></Link>} />
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {tiles.map((t) => (
              <Card key={t.label} className="p-3.5 sm:p-4"><p className={cn('text-xl sm:text-2xl font-bold leading-none', t.tone)}>{t.value}</p><p className="mt-1 text-xs text-text-muted">{t.label}</p></Card>
            ))}
          </div>

          {!filtering && (
            <section aria-label="Recent">
              <h2 className="mb-3 text-lg font-bold">Recent</h2>
              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none -mx-2 px-2 sm:mx-0 sm:px-0">
                {recent.map((p) => (
                  <Link key={p.id} to={`/app/projects/${p.id}`} className="flex w-56 sm:w-60 shrink-0 items-center gap-3 rounded-xl border border-surface-border bg-surface-card p-3 transition-all hover:border-primary-indigo/40 hover:shadow-md">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary-indigo to-primary-violet text-sm font-bold text-white">{p.name.charAt(0).toUpperCase()}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">{p.name}</span>
                      <span className="block truncate text-xs text-text-muted">{p.orgType === 'PERSONAL' ? 'Personal' : p.orgName}</span>
                    </span>
                    <Badge variant={syncTone(p.syncStatus)}>{p.syncStatus}</Badge>
                  </Link>
                ))}
              </div>
            </section>
          )}

          <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2.5 sm:gap-3" role="search">
            <div className="relative min-w-0 flex-1 sm:max-w-xs">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" aria-hidden />
              <input aria-label="Search projects" placeholder="Search projects..." value={q} onChange={(e) => setParam('q', e.target.value)}
                className={cn(select, 'w-full pl-9')} />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select aria-label="Sync status" className={select} value={statusFilter} onChange={(e) => setParam('status', e.target.value)}>
                <option value="">Any status</option>
                {['Synced', 'Syncing', 'Pending', 'Failed'].map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <select aria-label="Your role" className={select} value={roleFilter} onChange={(e) => setParam('role', e.target.value)}>
                <option value="">Any role</option>
                <option value="owner">Owner</option>
                <option value="contributor">Contributor</option>
              </select>
              <select aria-label="Sort by" className={cn(select, 'sm:ml-auto')} value={sort} onChange={(e) => setParam('sort', e.target.value === 'updated' ? '' : e.target.value)}>
                <option value="updated">Recently updated</option>
                <option value="name">Name A-Z</option>
                <option value="knowledge">Most knowledge</option>
                <option value="synced">Last synced</option>
              </select>
              <div className="flex overflow-hidden rounded-xl border border-surface-border shrink-0" role="group" aria-label="View">
                {([['grid', LayoutGrid, 'Grid view'], ['list', List, 'List view']] as const).map(([v, Icon, label]) => (
                  <button key={v} onClick={() => setView(v)} aria-label={label} aria-pressed={view === v}
                    className={cn('flex h-10 sm:h-9 w-10 sm:w-9 items-center justify-center transition-colors cursor-pointer', view === v ? 'bg-primary-light-indigo text-primary-indigo' : 'bg-surface-card text-text-muted hover:text-text-primary')}>
                    <Icon size={16} aria-hidden />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {filtered.length === 0 ? (
            <EmptyState icon={<Search size={36} />} title="No matching projects" description="Try different filters or a different search."
              action={<Button variant="outline" onClick={() => setParams({}, { replace: true })}>Clear filters</Button>} />
          ) : filtering ? (
            <Group title="Results" projects={filtered} view={view} />
          ) : (
            <>
              <Group title="Your projects" projects={mine} view={view} />
              <Group title="Shared with you" projects={shared} view={view} />
            </>
          )}
        </>
      )}
    </PageContainer>
  )
}
