import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ExternalLink,
  Ticket,
  RotateCw,
  Search,
  CheckCircle2,
  Clock,
  Layers,
  LayoutGrid,
  List,
  Sparkles,
  ShieldCheck,
  CheckSquare,
  Bookmark,
  Bug,
  ArrowUp,
  ArrowDown,
  Minus,
  MessageSquare,
  CheckCheck,
  FileText,
  Unlink,
} from 'lucide-react'
import { jiraApi, jiraSyncApi } from '../../api/jira'
import { Button } from '../../components/ui/Button'
import { Card, CardContent } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { Alert, ErrorState, LoadingState } from '../../components/ui/States'
import { useAsync } from '../../hooks/useAsync'
import { useProject } from '../../hooks/useProject'
import { errorMessage, timeAgo } from '../../lib/format'
import { cn } from '../../lib/cn'
import { jiraStatusGroup } from '../../lib/jiraStatus'
import { JiraIssueDrawer, type JiraIssue } from './JiraIssueDrawer'

export default function JiraTab() {
  const { detail } = useProject()
  const id = detail.project.id

  const status = useAsync(() => jiraApi.status(id), [id])
  const snapshot = useAsync(
    () => jiraSyncApi.state(id),
    [id],
    { cacheKey: `prism:project:${id}:jira_snapshot` }
  )

  const [viewMode, setViewMode] = useState<'board' | 'list'>('board')
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [typeFilter, setTypeFilter] = useState('All')
  const [selectedIssue, setSelectedIssue] = useState<JiraIssue | null>(null)

  // Site & Project selection state for initial connect
  const [site, setSite] = useState('')
  const [page, setPage] = useState(0)
  const [selected, setSelected] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const projects = useAsync(
    () => (site ? jiraApi.projects(id, site, page) : Promise.resolve(null)),
    [id, site, page]
  )

  // Auto-polling when sync is active
  useEffect(() => {
    if (snapshot.loading) return
    const isSyncing =
      snapshot.data?.connection?.sync_status === 'RUNNING' ||
      snapshot.data?.reports.some((r) => r.status === 'PENDING' || r.status === 'RUNNING')
    if (isSyncing) {
      const timer = setTimeout(snapshot.reload, 4000)
      return () => clearTimeout(timer)
    }
  }, [snapshot.data, snapshot.loading, snapshot.reload])

  const act = async (fn: () => Promise<unknown>) => {
    setBusy(true)
    setError(null)
    try {
      await fn()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const disconnect = () => {
    if (
      !window.confirm(
        'Disconnect this Jira project from PRISM? This removes stored access tokens and imported snapshot data from PRISM.'
      )
    )
      return
    void act(async () => {
      await jiraApi.disconnect(id)
      setSite('')
      setSelected('')
      setPage(0)
      status.reload()
      snapshot.reload()
    })
  }

  const handleSync = () => {
    void act(async () => {
      await jiraSyncApi.sync(id)
      snapshot.reload()
    })
  }

  const issues = useMemo(() => snapshot.data?.issues ?? [], [snapshot.data?.issues])

  // Calculated metrics
  const totalCount = issues.length
  const toDoIssues = useMemo(
    () =>
      issues.filter((i) => {
        const s = (i.status || '').toLowerCase()
        return jiraStatusGroup(s) === 'To Do'
      }),
    [issues]
  )
  const inProgressIssues = useMemo(
    () =>
      issues.filter((i) => {
        const s = (i.status || '').toLowerCase()
        return jiraStatusGroup(s) === 'In Progress'
      }),
    [issues]
  )
  const doneIssues = useMemo(
    () =>
      issues.filter((i) => {
        const s = (i.status || '').toLowerCase()
        return jiraStatusGroup(s) === 'Done'
      }),
    [issues]
  )

  const completionRate = totalCount > 0 ? Math.round((doneIssues.length / totalCount) * 100) : 0

  // Filtered issues
  const filteredIssues = useMemo(() => {
    const q = query.trim().toLowerCase()
    return issues.filter((i) => {
      const s = (i.status || '').toLowerCase()
      const statusGroup = jiraStatusGroup(s)

      const matchStatus = statusFilter === 'All' || statusGroup === statusFilter || i.status.toLowerCase() === statusFilter.toLowerCase()
      const matchType = typeFilter === 'All' || (i.issue_type || '').toLowerCase() === typeFilter.toLowerCase()
      const matchQuery =
        !q ||
        i.issue_key.toLowerCase().includes(q) ||
        (i.summary || '').toLowerCase().includes(q) ||
        (i.description || '').toLowerCase().includes(q) ||
        (i.acceptance_criteria || '').toLowerCase().includes(q)

      return matchStatus && matchType && matchQuery
    })
  }, [issues, query, statusFilter, typeFilter])

  const types = useMemo(() => ['All', ...new Set(issues.map((i) => i.issue_type || 'Task'))], [issues])
  const statusFilters = ['All', 'To Do', 'In Progress', 'Done']

  if (status.loading && !status.data) return <LoadingState rows={3} />
  if (status.error || !status.data) {
    return <ErrorState message={status.error ?? 'Could not load Jira connection'} onRetry={status.reload} />
  }

  if (status.data.connected && snapshot.loading && !snapshot.data) return <LoadingState label="Loading Jira issues..." />
  if (status.data.connected && snapshot.error && !snapshot.data) return <ErrorState message={snapshot.error} onRetry={snapshot.reload} />

  const data = status.data
  const isSyncRunning = snapshot.data?.connection?.sync_status === 'RUNNING'

  const renderTypeIcon = (type: string) => {
    const t = (type || '').toLowerCase()
    if (t.includes('bug')) return <Bug size={14} className="text-red-600 shrink-0" />
    if (t.includes('story')) return <Bookmark size={14} className="text-emerald-600 shrink-0" />
    if (t.includes('epic')) return <Layers size={14} className="text-purple-600 shrink-0" />
    return <CheckSquare size={14} className="text-blue-600 shrink-0" />
  }

  const renderPriorityIcon = (priority: string) => {
    const p = (priority || '').toLowerCase()
    if (p.includes('highest') || p.includes('high') || p.includes('critical') || p.includes('blocker')) {
      return (
        <span title={`Priority: ${priority || 'High'}`}>
          <ArrowUp size={13} className="text-red-600 shrink-0" />
        </span>
      )
    }
    if (p.includes('low') || p.includes('lowest') || p.includes('minor')) {
      return (
        <span title={`Priority: ${priority || 'Low'}`}>
          <ArrowDown size={13} className="text-blue-600 shrink-0" />
        </span>
      )
    }
    return (
      <span title={`Priority: ${priority || 'Medium'}`}>
        <Minus size={13} className="text-amber-600 shrink-0" />
      </span>
    )
  }

  const renderStatusLozenge = (statusStr: string) => {
    const s = (statusStr || '').toLowerCase()
    if (jiraStatusGroup(s) === 'Done') {
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-emerald-700">
          <CheckCircle2 size={11} />
          <span>{statusStr}</span>
        </span>
      )
    }
    if (jiraStatusGroup(s) === 'In Progress') {
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 border border-blue-200 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-blue-700">
          <Clock size={11} />
          <span>{statusStr}</span>
        </span>
      )
    }
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 border border-slate-200 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-slate-700">
        <span>{statusStr || 'To Do'}</span>
      </span>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md shadow-blue-500/25">
              <Ticket size={22} />
            </div>
            <div>
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <span>Jira Requirements & Epics</span>
                {data.connected && data.projectKey && (
                  <Badge variant="primary" className="bg-blue-50 text-blue-700 border-blue-200 font-mono text-xs">
                    {data.projectKey}
                  </Badge>
                )}
              </h2>
              <p className="text-xs text-text-muted mt-0.5">
                Full-fidelity agile tracking: epics, stories, and acceptance criteria aligned with GitHub architecture models.
              </p>
            </div>
          </div>
        </div>

        {data.connected && (
          <div className="flex flex-wrap items-center gap-2.5">
            {data.siteUrl && data.projectKey && (
              <a
                href={`${data.siteUrl}/browse/${encodeURIComponent(data.projectKey)}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-xl border border-surface-border bg-surface-card px-3.5 py-2 text-xs font-semibold text-text-secondary hover:bg-surface-background hover:text-text-primary transition-colors shadow-xs"
              >
                <span>Open in Jira</span>
                <ExternalLink size={13} aria-hidden />
              </a>
            )}

            {data.canManage && (
              <Button
                isLoading={busy || isSyncRunning}
                onClick={handleSync}
                className="shadow-lg shadow-blue-600/20 bg-blue-600 hover:bg-blue-700 text-white"
              >
                <RotateCw size={14} className={cn(isSyncRunning && 'animate-spin')} />
                <span>{isSyncRunning ? 'Syncing Jira...' : 'Sync Jira issues'}</span>
              </Button>
            )}

            {data.canManage && (
              <Button
                variant="outline"
                size="sm"
                onClick={disconnect}
                className="text-text-muted hover:text-danger hover:border-red-200"
                title="Disconnect Jira integration"
              >
                <Unlink size={14} />
              </Button>
            )}
          </div>
        )}
      </div>

      {error && <Alert tone="error">{error}</Alert>}
      {snapshot.error && <Alert tone="error">Snapshot error: {snapshot.error}</Alert>}
      {snapshot.data?.connection?.sync_error && <Alert tone="error">{snapshot.data.connection.sync_error}</Alert>}
      {!data.configured && (
        <Alert tone="info">
          Jira OAuth is not configured on the server. Ask an administrator to supply Atlassian OAuth credentials.
        </Alert>
      )}

      {/* When Jira is NOT yet authorized / connected */}
      {!data.authorized ? (
        <Card className="border-indigo-100 bg-gradient-to-br from-surface-card via-surface-card to-blue-50/30">
          <CardContent className="p-8 space-y-6 text-center max-w-xl mx-auto">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 shadow-inner">
              <Ticket size={32} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-text-primary">Connect your Atlassian Jira Project</h3>
              <p className="mt-2 text-sm text-text-secondary leading-relaxed">
                Import user stories, bug reports, and acceptance criteria into PRISM. Requirements are cross-referenced against your verified GitHub implementation to generate comprehensive architectural reports.
              </p>
            </div>

            <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4 text-left text-xs text-blue-900 space-y-2">
              <div className="flex items-center gap-2 font-semibold">
                <ShieldCheck size={16} className="text-blue-600" />
                <span>Security & Scope Guarantees</span>
              </div>
              <ul className="list-disc pl-5 space-y-1 text-text-secondary">
                <li>PRISM requests standard read-only access to Jira issues and comments.</li>
                <li>No Jira passwords or administrative API keys are stored in PRISM.</li>
                <li>Security-restricted issues and internal confidential comments are strictly excluded.</li>
              </ul>
            </div>

            {data.canManage ? (
              <Button
                isLoading={busy}
                disabled={!data.configured}
                onClick={() =>
                  void act(async () => {
                    const { url } = await jiraApi.authorize(id)
                    const target = new URL(url)
                    if (target.origin !== 'https://auth.atlassian.com') throw new Error('Invalid Jira authorization URL')
                    window.location.assign(url)
                  })
                }
                className="w-full sm:w-auto shadow-lg shadow-blue-600/20 bg-blue-600 hover:bg-blue-700 text-white px-8 py-2.5 text-sm"
              >
                Connect Jira Workspace
              </Button>
            ) : (
              <Alert tone="info">Ask a workspace administrator who owns this PRISM project to connect Jira.</Alert>
            )}
          </CardContent>
        </Card>
      ) : !data.connected ? (
        /* Authorized but site/project picker required */
        <Card className="border-surface-border">
          <CardContent className="p-6 space-y-5">
            <div>
              <h3 className="text-lg font-bold text-text-primary">Select Jira Site & Project</h3>
              <p className="text-xs text-text-muted mt-1">
                Choose the Jira site and project to synchronize with <strong className="text-text-primary">{detail.project.name}</strong>.
              </p>
            </div>

            {data.canManage && data.sites.length > 0 ? (
              <div className="space-y-4 max-w-lg">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-text-muted mb-1.5">
                    Authorized Atlassian Site
                  </label>
                  <select
                    className="block w-full rounded-xl border border-surface-border bg-surface-card p-3 text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                    value={site}
                    disabled={busy}
                    onChange={(e) => {
                      setSite(e.target.value)
                      setPage(0)
                      setSelected('')
                      setError(null)
                    }}
                  >
                    <option value="">Select an authorized site...</option>
                    {data.sites.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.url})
                      </option>
                    ))}
                  </select>
                </div>

                {site && (
                  <div>
                    {projects.loading ? (
                      <LoadingState rows={1} />
                    ) : projects.error ? (
                      <ErrorState message={projects.error} onRetry={projects.reload} />
                    ) : (
                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-text-muted mb-1.5">
                            Target Jira Project
                          </label>
                          <select
                            className="block w-full rounded-xl border border-surface-border bg-surface-card p-3 text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                            value={selected}
                            disabled={busy}
                            onChange={(e) => setSelected(e.target.value)}
                          >
                            <option value="">Select a Jira project...</option>
                            {projects.data?.values.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.key} • {p.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        {projects.data?.values.length === 0 && (
                          <Alert tone="info">No Jira projects found on this site. Check your Atlassian permissions.</Alert>
                        )}

                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={busy || page === 0}
                            onClick={() => {
                              setPage(Math.max(0, page - 50))
                              setSelected('')
                            }}
                          >
                            Previous
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={busy || !projects.data || projects.data.isLast}
                            onClick={() => {
                              if (projects.data) setPage(projects.data.nextStartAt)
                              setSelected('')
                            }}
                          >
                            Next
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <Button
                  isLoading={busy}
                  disabled={!site || !selected || projects.loading || !!projects.error}
                  onClick={() =>
                    void act(async () => {
                      await jiraApi.select(id, site, selected)
                      status.reload()
                      snapshot.reload()
                    })
                  }
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Link selected Jira project
                </Button>
              </div>
            ) : (
              <Alert tone="info">
                The user who authorized Jira needs to select the project. An owner can disconnect to switch accounts.
              </Alert>
            )}
          </CardContent>
        </Card>
      ) : (
        /* Connected Jira Dashboard View */
        <div className="space-y-6">
          {/* Key Metric Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Issues */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
              <Card className="p-5 border-blue-100 bg-gradient-to-br from-surface-card via-surface-card to-blue-50/20">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-text-muted">Total Requirements</span>
                  <span className="rounded-lg bg-blue-100/70 p-2 text-blue-700">
                    <Ticket size={18} />
                  </span>
                </div>
                <p className="mt-2 text-3xl font-black text-text-primary">{totalCount}</p>
                <p className="text-[11px] text-text-muted mt-1">
                  Synchronized from {data.projectName || data.projectKey || 'Jira'}
                </p>
              </Card>
            </motion.div>

            {/* To Do */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.05 }}>
              <Card className="p-5 border-slate-200 bg-slate-50/40">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700">To Do</span>
                  <span className="rounded-lg bg-slate-200/60 p-2 text-slate-700">
                    <FileText size={18} />
                  </span>
                </div>
                <p className="mt-2 text-3xl font-black text-slate-800">{toDoIssues.length}</p>
                <p className="text-[11px] text-slate-600 mt-1">Awaiting implementation</p>
              </Card>
            </motion.div>

            {/* In Progress */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.1 }}>
              <Card className="p-5 border-blue-200 bg-blue-50/40">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-blue-800">In Progress</span>
                  <span className="rounded-lg bg-blue-100/80 p-2 text-blue-700">
                    <Clock size={18} />
                  </span>
                </div>
                <p className="mt-2 text-3xl font-black text-blue-900">{inProgressIssues.length}</p>
                <p className="text-[11px] text-blue-700 mt-1">Active sprint work</p>
              </Card>
            </motion.div>

            {/* Done / Progress */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.15 }}>
              <Card className="p-5 border-emerald-200 bg-emerald-50/40">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">Resolved ({completionRate}%)</span>
                  <span className="rounded-lg bg-emerald-100/80 p-2 text-emerald-700">
                    <CheckCircle2 size={18} />
                  </span>
                </div>
                <p className="mt-2 text-3xl font-black text-emerald-900">{doneIssues.length}</p>
                {/* Progress bar */}
                <div className="mt-2 h-1.5 w-full rounded-full bg-emerald-200/60 overflow-hidden">
                  <div
                    className="h-full bg-emerald-600 transition-all duration-500 rounded-full"
                    style={{ width: `${completionRate}%` }}
                  />
                </div>
              </Card>
            </motion.div>
          </div>

          {/* Architecture Sync & Report Traceability Banner */}
          <div className="rounded-2xl border border-indigo-100 bg-gradient-to-r from-surface-card via-indigo-50/20 to-purple-50/20 p-4 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-indigo/10 text-primary-indigo">
                  <Sparkles size={20} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-text-primary flex items-center gap-2">
                    <span>Engineering Traceability & Architecture Reports</span>
                    {snapshot.data?.connection?.synced_at && (
                      <span className="text-[11px] font-normal text-text-muted">
                        • Synced {timeAgo(snapshot.data.connection.synced_at)}
                      </span>
                    )}
                  </h4>
                  <p className="text-xs text-text-secondary mt-0.5">
                    Imported requirements are integrated into PDF report appendices and AI technical dossiers while remaining cleanly separated from verified code.
                  </p>
                </div>
              </div>

              {snapshot.data?.reports && snapshot.data.reports.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  {snapshot.data.reports.map((r) => (
                    <span
                      key={r.repo_name}
                      className={cn(
                        'inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium',
                        r.status === 'SYNCED'
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                          : 'border-amber-200 bg-amber-50 text-amber-800'
                      )}
                    >
                      <RotateCw size={11} className={cn(r.status === 'PENDING' && 'animate-spin')} />
                      <span>{r.repo_name}: {r.status}</span>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Search, Filters, and Board/List Switcher Toolbar */}
          <div className="flex flex-col gap-3 rounded-2xl border border-surface-border bg-surface-card p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              {/* Search bar */}
              <div className="relative flex-1 min-w-[260px]">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" aria-hidden />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search by key, summary, description, or criteria..."
                  aria-label="Search Jira issues"
                  className="h-10 w-full rounded-xl border border-surface-border bg-surface-background pl-9 pr-3 text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* View Switcher (Board vs List) */}
              <div className="flex items-center rounded-xl border border-surface-border bg-surface-background p-1" role="group" aria-label="View mode">
                <button
                  onClick={() => setViewMode('board')}
                  className={cn(
                    'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer',
                    viewMode === 'board'
                      ? 'bg-surface-card text-blue-700 shadow-xs'
                      : 'text-text-muted hover:text-text-primary'
                  )}
                >
                  <LayoutGrid size={14} />
                  <span>Kanban Board</span>
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={cn(
                    'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer',
                    viewMode === 'list'
                      ? 'bg-surface-card text-blue-700 shadow-xs'
                      : 'text-text-muted hover:text-text-primary'
                  )}
                >
                  <List size={14} />
                  <span>List View</span>
                </button>
              </div>
            </div>

            {/* Filter pills */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-surface-border/60">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-text-muted mr-1">Status:</span>
                {statusFilters.map((s) => (
                  <button
                    key={s}
                    onClick={() => setStatusFilter(s)}
                    className={cn(
                      'rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer',
                      statusFilter === s
                        ? 'border-blue-600 bg-blue-600 text-white shadow-xs'
                        : 'border-surface-border bg-surface-background text-text-secondary hover:bg-surface-border/50'
                    )}
                  >
                    {s}
                  </button>
                ))}

                <span className="text-xs font-semibold text-text-muted ml-2 mr-1">Type:</span>
                {types.map((t) => (
                  <button
                    key={t}
                    onClick={() => setTypeFilter(t)}
                    className={cn(
                      'rounded-full border px-3 py-0.5 text-xs font-medium transition-colors cursor-pointer',
                      typeFilter === t
                        ? 'border-blue-600 bg-blue-50 text-blue-700 font-semibold'
                        : 'border-surface-border bg-surface-background text-text-secondary hover:bg-surface-border/40'
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>

              <span className="text-xs text-text-muted">
                Showing <strong className="text-text-primary">{filteredIssues.length}</strong> of {totalCount} issues
              </span>
            </div>
          </div>

          {/* No Issues Match Filter Empty State */}
          {filteredIssues.length === 0 ? (
            <div className="rounded-3xl border border-surface-border bg-surface-card/60 p-12 text-center space-y-3">
              <Ticket size={32} className="mx-auto text-text-muted" />
              <h3 className="font-bold text-lg text-text-primary">No Jira issues match your filters</h3>
              <p className="text-xs text-text-secondary max-w-sm mx-auto">
                Try adjusting your search query or reset status and issue type filters to view all synchronized issues.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setQuery('')
                  setStatusFilter('All')
                  setTypeFilter('All')
                }}
              >
                Reset Filters
              </Button>
            </div>
          ) : viewMode === 'board' ? (
            /* Kanban Board View */
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-start">
              {/* Column 1: To Do */}
              <div className="rounded-2xl border border-surface-border/80 bg-surface-background/60 p-4 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-surface-border">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-slate-400" />
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-800">To Do</span>
                  </div>
                  <span className="rounded-full bg-surface-card px-2 py-0.5 text-xs font-bold text-slate-700 border border-surface-border">
                    {filteredIssues.filter((i) => {
                      const s = (i.status || '').toLowerCase()
                      return jiraStatusGroup(s) === 'To Do'
                    }).length}
                  </span>
                </div>

                <div className="space-y-3 min-h-[160px]">
                  {filteredIssues
                    .filter((i) => {
                      const s = (i.status || '').toLowerCase()
                      return jiraStatusGroup(s) === 'To Do'
                    })
                    .map((issue) => (
                      <motion.div
                        key={issue.issue_key}
                        whileHover={{ y: -2 }}
                        transition={{ duration: 0.15 }}
                      >
                        <Card
                          role="button"
                          tabIndex={0}
                          onClick={() => setSelectedIssue(issue)}
                          onKeyDown={(e) => e.key === 'Enter' && setSelectedIssue(issue)}
                          className="cursor-pointer border-surface-border/80 hover:border-blue-500/60 hover:shadow-md transition-all duration-200 bg-surface-card p-4 space-y-2.5"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="inline-flex items-center gap-1.5 font-mono text-xs font-bold text-blue-700">
                              {renderTypeIcon(issue.issue_type)}
                              <span>{issue.issue_key}</span>
                            </span>
                            {renderPriorityIcon(issue.priority)}
                          </div>

                          <h4 className="text-sm font-semibold text-text-primary line-clamp-2 leading-snug">
                            {issue.summary}
                          </h4>

                          {issue.description && (
                            <p className="text-xs text-text-secondary line-clamp-2 leading-relaxed">
                              {issue.description}
                            </p>
                          )}

                          <div className="flex items-center justify-between pt-2 border-t border-surface-border/50 text-[11px] text-text-muted">
                            <div className="flex items-center gap-2">
                              {issue.acceptance_criteria && (
                                <span className="inline-flex items-center gap-1 text-emerald-700" title="Has Acceptance Criteria">
                                  <CheckCheck size={13} />
                                </span>
                              )}
                              {issue.comments && (
                                <span className="inline-flex items-center gap-1 text-text-muted" title="Has Discussions">
                                  <MessageSquare size={12} />
                                </span>
                              )}
                            </div>
                            <span>{timeAgo(issue.source_updated_at)}</span>
                          </div>
                        </Card>
                      </motion.div>
                    ))}
                </div>
              </div>

              {/* Column 2: In Progress */}
              <div className="rounded-2xl border border-blue-200/80 bg-blue-50/20 p-4 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-blue-200/60">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-blue-500 animate-pulse" />
                    <span className="text-xs font-bold uppercase tracking-wider text-blue-900">In Progress</span>
                  </div>
                  <span className="rounded-full bg-surface-card px-2 py-0.5 text-xs font-bold text-blue-800 border border-blue-200">
                    {filteredIssues.filter((i) => {
                      const s = (i.status || '').toLowerCase()
                      return jiraStatusGroup(s) === 'In Progress'
                    }).length}
                  </span>
                </div>

                <div className="space-y-3 min-h-[160px]">
                  {filteredIssues
                    .filter((i) => {
                      const s = (i.status || '').toLowerCase()
                      return jiraStatusGroup(s) === 'In Progress'
                    })
                    .map((issue) => (
                      <motion.div
                        key={issue.issue_key}
                        whileHover={{ y: -2 }}
                        transition={{ duration: 0.15 }}
                      >
                        <Card
                          role="button"
                          tabIndex={0}
                          onClick={() => setSelectedIssue(issue)}
                          onKeyDown={(e) => e.key === 'Enter' && setSelectedIssue(issue)}
                          className="cursor-pointer border-blue-200 hover:border-blue-500 hover:shadow-md transition-all duration-200 bg-surface-card p-4 space-y-2.5"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="inline-flex items-center gap-1.5 font-mono text-xs font-bold text-blue-700">
                              {renderTypeIcon(issue.issue_type)}
                              <span>{issue.issue_key}</span>
                            </span>
                            {renderPriorityIcon(issue.priority)}
                          </div>

                          <h4 className="text-sm font-semibold text-text-primary line-clamp-2 leading-snug">
                            {issue.summary}
                          </h4>

                          {issue.description && (
                            <p className="text-xs text-text-secondary line-clamp-2 leading-relaxed">
                              {issue.description}
                            </p>
                          )}

                          <div className="flex items-center justify-between pt-2 border-t border-surface-border/50 text-[11px] text-text-muted">
                            <div className="flex items-center gap-2">
                              {issue.acceptance_criteria && (
                                <span className="inline-flex items-center gap-1 text-emerald-700" title="Has Acceptance Criteria">
                                  <CheckCheck size={13} />
                                </span>
                              )}
                              {issue.comments && (
                                <span className="inline-flex items-center gap-1 text-text-muted" title="Has Discussions">
                                  <MessageSquare size={12} />
                                </span>
                              )}
                            </div>
                            <span>{timeAgo(issue.source_updated_at)}</span>
                          </div>
                        </Card>
                      </motion.div>
                    ))}
                  {filteredIssues.filter((i) => {
                    const s = (i.status || '').toLowerCase()
                    return jiraStatusGroup(s) === 'In Progress'
                  }).length === 0 && (
                    <p className="py-8 text-center text-xs text-text-muted">No issues in active development</p>
                  )}
                </div>
              </div>

              {/* Column 3: Done */}
              <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/20 p-4 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-emerald-200/60">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-900">Done</span>
                  </div>
                  <span className="rounded-full bg-surface-card px-2 py-0.5 text-xs font-bold text-emerald-800 border border-emerald-200">
                    {filteredIssues.filter((i) => {
                      const s = (i.status || '').toLowerCase()
                      return jiraStatusGroup(s) === 'Done'
                    }).length}
                  </span>
                </div>

                <div className="space-y-3 min-h-[160px]">
                  {filteredIssues
                    .filter((i) => {
                      const s = (i.status || '').toLowerCase()
                      return jiraStatusGroup(s) === 'Done'
                    })
                    .map((issue) => (
                      <motion.div
                        key={issue.issue_key}
                        whileHover={{ y: -2 }}
                        transition={{ duration: 0.15 }}
                      >
                        <Card
                          role="button"
                          tabIndex={0}
                          onClick={() => setSelectedIssue(issue)}
                          onKeyDown={(e) => e.key === 'Enter' && setSelectedIssue(issue)}
                          className="cursor-pointer border-emerald-200/70 hover:border-emerald-500 hover:shadow-md transition-all duration-200 bg-surface-card p-4 space-y-2.5"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="inline-flex items-center gap-1.5 font-mono text-xs font-bold text-emerald-700">
                              {renderTypeIcon(issue.issue_type)}
                              <span>{issue.issue_key}</span>
                            </span>
                            {renderPriorityIcon(issue.priority)}
                          </div>

                          <h4 className="text-sm font-semibold text-text-primary line-clamp-2 leading-snug">
                            {issue.summary}
                          </h4>

                          {issue.description && (
                            <p className="text-xs text-text-secondary line-clamp-2 leading-relaxed">
                              {issue.description}
                            </p>
                          )}

                          <div className="flex items-center justify-between pt-2 border-t border-surface-border/50 text-[11px] text-text-muted">
                            <div className="flex items-center gap-2">
                              {issue.acceptance_criteria && (
                                <span className="inline-flex items-center gap-1 text-emerald-700" title="Has Acceptance Criteria">
                                  <CheckCheck size={13} />
                                </span>
                              )}
                              {issue.comments && (
                                <span className="inline-flex items-center gap-1 text-text-muted" title="Has Discussions">
                                  <MessageSquare size={12} />
                                </span>
                              )}
                            </div>
                            <span className="text-emerald-700 font-medium">Completed</span>
                          </div>
                        </Card>
                      </motion.div>
                    ))}
                </div>
              </div>
            </div>
          ) : (
            /* List View */
            <div className="space-y-3">
              {filteredIssues.map((issue, idx) => (
                <motion.div
                  key={issue.issue_key}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: Math.min(idx, 8) * 0.03 }}
                >
                  <Card
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedIssue(issue)}
                    onKeyDown={(e) => e.key === 'Enter' && setSelectedIssue(issue)}
                    className="cursor-pointer transition-all duration-200 hover:border-blue-500/60 hover:shadow-md p-4 bg-surface-card"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <span className="mt-0.5">{renderTypeIcon(issue.issue_type)}</span>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <span className="font-mono text-xs font-bold text-blue-700 hover:underline">
                              {issue.issue_key}
                            </span>
                            {renderStatusLozenge(issue.status)}
                            {issue.acceptance_criteria && (
                              <span className="inline-flex items-center gap-1 rounded bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 text-[10px] font-semibold text-emerald-800">
                                <CheckCheck size={11} /> Criteria
                              </span>
                            )}
                          </div>
                          <h4 className="text-sm font-semibold text-text-primary leading-snug">
                            {issue.summary}
                          </h4>
                          {issue.description && (
                            <p className="text-xs text-text-secondary line-clamp-1 mt-0.5">
                              {issue.description}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-4 shrink-0 self-end sm:self-center text-xs text-text-muted">
                        <div className="flex items-center gap-1.5">
                          {renderPriorityIcon(issue.priority)}
                          <span className="capitalize">{issue.priority || 'Medium'}</span>
                        </div>
                        <span className="text-surface-border">•</span>
                        <span>{timeAgo(issue.source_updated_at)}</span>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Slide-over Issue Detail Drawer */}
      <AnimatePresence>
        {selectedIssue && (
          <JiraIssueDrawer
            issue={selectedIssue}
            onClose={() => setSelectedIssue(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
