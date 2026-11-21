import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { AlertCircle, ArrowLeft, BookOpen, CheckCircle2, Clock, History, LayoutDashboard, FileBarChart, MessageSquare, RefreshCw, Settings, Sparkles, Ticket, type LucideIcon } from 'lucide-react'
import { Link, NavLink, Outlet, useParams } from 'react-router-dom'
import { projectApi } from '../../api/endpoints'
import type { ProjectDetail, SyncStatus } from '../../api/types'
import { ErrorState, LoadingState } from '../../components/ui/States'
import { useAsync } from '../../hooks/useAsync'
import { cn } from '../../lib/cn'

export interface ProjectContext {
  detail: ProjectDetail
  reload: () => void
}

const tabs: { label: string; path: string; icon: LucideIcon; soon?: boolean; highlight?: boolean }[] = [
  { label: 'Overview', path: '', icon: LayoutDashboard },
  { label: 'Ask PRISM', path: 'assistant', icon: Sparkles, highlight: true },
  { label: 'Knowledge', path: 'knowledge', icon: BookOpen },
  { label: 'Report', path: 'report', icon: FileBarChart },
  { label: 'History', path: 'history', icon: History },
  { label: 'Jira', path: 'jira', icon: Ticket },
  { label: 'Prompts', path: 'prompts', icon: MessageSquare, soon: true },
  { label: 'Settings', path: 'settings', icon: Settings },
]

const syncConfig: Record<SyncStatus, { icon: LucideIcon; style: string }> = {
  Synced: { icon: CheckCircle2, style: 'bg-emerald-50 text-emerald-600' },
  Syncing: { icon: RefreshCw, style: 'bg-blue-50 text-blue-600' },
  Failed: { icon: AlertCircle, style: 'bg-red-50 text-red-600' },
  Pending: { icon: Clock, style: 'bg-amber-50 text-amber-600' },
}

export default function ProjectLayout() {
  const { projectId } = useParams()
  const id = Number(projectId)
  const valid = Number.isInteger(id) && id > 0
  const { data, loading, error, reload } = useAsync(
    () => (valid ? projectApi.get(id) : Promise.reject(new Error('Project not found'))),
    [id, valid],
    { cacheKey: valid ? `prism:project:${id}:detail` : undefined }
  )

  useEffect(() => {
    if (!data || loading) return
    const isSyncing = data.project.syncStatus === 'Syncing' || data.project.syncStatus === 'Pending' ||
      data.repositories.some((r) => r.syncStatus === 'Syncing' || r.syncStatus === 'Pending')
    if (!isSyncing) return
    const timer = setTimeout(() => {
      reload()
    }, 3000)
    return () => clearTimeout(timer)
  }, [data, loading, reload])

  useEffect(() => {
    if (!data) return
    const isSyncing = data.project.syncStatus === 'Syncing' || data.project.syncStatus === 'Pending' ||
      data.repositories.some((r) => r.syncStatus === 'Syncing' || r.syncStatus === 'Pending')
    if (!isSyncing) return
    const interval = setInterval(() => {
      void reload()
    }, 3000)
    return () => clearInterval(interval)
  }, [data, reload])

  if (loading && !data) return <div className="mx-auto max-w-7xl p-4 sm:p-6 md:p-8"><LoadingState rows={2} /></div>
  if (error || !data) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 p-4 sm:p-6 md:p-8">
        <Link to="/app/projects" className="inline-flex items-center gap-1 text-sm text-primary-indigo hover:underline"><ArrowLeft size={14} aria-hidden /> All projects</Link>
        <ErrorState message={error ?? 'Project not found.'} onRetry={reload} />
      </div>
    )
  }

  const { project } = data
  const sync = syncConfig[project.syncStatus]
  const SyncIcon = sync.icon

  return (
    <div className="flex min-h-full flex-col">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
        className="border-b border-surface-border bg-surface-card px-4 sm:px-6 pb-0 pt-4 sm:pt-5">
        <Link to="/app/projects" className="mb-2 sm:mb-3 inline-flex items-center gap-1 text-xs text-text-muted hover:text-primary-indigo"><ArrowLeft size={12} aria-hidden /> All projects</Link>
        <div className="mb-3 sm:mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
          <div className="min-w-0">
            <h1 className="break-words text-xl sm:text-2xl font-bold text-text-primary">{project.name}</h1>
            {project.description && <p className="mt-1 text-xs sm:text-sm text-text-secondary line-clamp-2">{project.description}</p>}
          </div>
          <div className={cn('flex shrink-0 self-start sm:self-center items-center gap-1.5 sm:gap-2 rounded-full px-3 py-1 text-xs sm:text-sm font-medium', sync.style)}>
            <SyncIcon size={14} className={project.syncStatus === 'Syncing' ? 'animate-spin' : ''} aria-hidden />{project.syncStatus}
          </div>
        </div>
        <nav className="-mb-px flex gap-1 overflow-x-auto scrollbar-none no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0" aria-label="Project">
          {tabs.map((t) => (
            <NavLink key={t.label} to={t.path} end={t.path === ''}
              className={({ isActive }) => cn(
                'flex items-center gap-1.5 sm:gap-2 whitespace-nowrap rounded-t-xl border-b-2 px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-medium transition-all duration-200',
                isActive ? 'border-primary-indigo bg-primary-light-indigo/40 text-primary-indigo' : 'border-transparent text-text-secondary hover:bg-surface-background hover:text-text-primary',
                t.highlight && !isActive && 'text-indigo-600 font-semibold'
              )}>
              <t.icon size={15} aria-hidden className="shrink-0" />
              <span>{t.label}</span>
              {t.soon && <span className="rounded bg-surface-border px-1.5 py-0.2 text-[9px] font-semibold uppercase text-text-muted">Soon</span>}
              {t.highlight && <span className="rounded bg-gradient-to-r from-indigo-500 to-purple-500 px-1.5 py-0.5 text-[9px] font-bold uppercase text-white shadow-2xs">AI</span>}
            </NavLink>
          ))}
        </nav>
      </motion.div>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3, delay: 0.1 }} className="flex-1">
        <div className="mx-auto w-full max-w-7xl p-3 sm:p-4 md:p-6 lg:p-8">
          <Outlet key={id} context={{ detail: data, reload } satisfies ProjectContext} />
        </div>
      </motion.div>
    </div>
  )
}
