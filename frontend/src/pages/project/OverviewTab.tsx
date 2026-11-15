import { BookOpen, GitBranch, RefreshCw, Users, Clock, ShieldCheck, AlertTriangle, AlertCircle, HelpCircle, RotateCw, History } from 'lucide-react'
import { motion } from 'framer-motion'
import { useState, useEffect, useCallback, useRef } from 'react'
import { activityApi, freshnessApi, projectApi } from '../../api/endpoints'
import type { ExtractionSyncStatus, SyncHistoryItem } from '../../api/types'
import { ActivityList } from '../../components/ActivityList'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card'
import { Alert } from '../../components/ui/States'
import { SyncProgressSection } from '../../components/sync/SyncProgressSection'
import { SyncHistoryTable } from '../../components/sync/SyncHistoryTable'
import { useAsync } from '../../hooks/useAsync'
import { useProject } from '../../hooks/useProject'
import { errorMessage, safeUrl, timeAgo } from '../../lib/format'
import { syncTone } from '../../lib/tones'
import { cn } from '../../lib/cn'

export default function OverviewTab() {
  const { detail, reload } = useProject()
  const { project, repositories } = detail
  const recent = useAsync(() => activityApi.list(project.id, 0, 5), [project.id])
  const freshness = useAsync(() => freshnessApi.overview(project.id), [project.id])
  const [busy, setBusy] = useState<'sync' | 'recheck' | null>(null)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [syncStatus, setSyncStatus] = useState<ExtractionSyncStatus | null>(null)
  const [syncHistory, setSyncHistory] = useState<SyncHistoryItem[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)
  const pollTimerRef = useRef<number | null>(null)

  const loadSyncHistory = useCallback(async () => {
    try {
      setLoadingHistory(true)
      const list = await projectApi.syncHistory(project.id)
      setSyncHistory(list)
    } catch {
    } finally {
      setLoadingHistory(false)
    }
  }, [project.id])

  const fetchSyncStatus = useCallback(async () => {
    try {
      const s = await projectApi.syncStatus(project.id)
      setSyncStatus(s)
      return s
    } catch {
      return null
    }
  }, [project.id])

  const stopPolling = useCallback(() => {
    if (pollTimerRef.current !== null) {
      clearInterval(pollTimerRef.current)
      pollTimerRef.current = null
    }
  }, [])

  const startPolling = useCallback(() => {
    stopPolling()
    pollTimerRef.current = window.setInterval(async () => {
      const current = await fetchSyncStatus()
      if (current && !current.active) {
        stopPolling()
        recent.reload()
        freshness.reload()
        reload()
        void loadSyncHistory()
      }
    }, 2000)
  }, [fetchSyncStatus, stopPolling, recent, freshness, reload, loadSyncHistory])

  useEffect(() => {
    void (async () => {
      const initial = await fetchSyncStatus()
      if (initial?.active) {
        startPolling()
      }
      void loadSyncHistory()
    })()

    return () => {
      stopPolling()
    }
  }, [project.id, fetchSyncStatus, startPolling, stopPolling, loadSyncHistory])

  const runSync = async () => {
    setBusy('sync')
    setMsg(null)
    try {
      const r = await projectApi.sync(project.id)
      setMsg({ ok: true, text: `Sync requested for ${r.queued} ${r.queued === 1 ? 'repository' : 'repositories'}.` })
      await fetchSyncStatus()
      startPolling()
      recent.reload()
      freshness.reload()
      reload()
    } catch (err) {
      setMsg({ ok: false, text: errorMessage(err) })
    } finally {
      setBusy(null)
    }
  }

  const runRecheck = async () => {
    setBusy('recheck')
    setMsg(null)
    try {
      await freshnessApi.recheck(project.id)
      setMsg({ ok: true, text: 'Repository drift rechecked against latest commit tree.' })
      freshness.reload()
      reload()
    } catch (err) {
      setMsg({ ok: false, text: errorMessage(err) })
    } finally {
      setBusy(null)
    }
  }

  const stats = [
    { label: 'Knowledge items', value: project.knowledgeItemCount, icon: BookOpen },
    { label: 'Repositories', value: project.repositoryCount, icon: GitBranch },
    { label: 'Members', value: project.memberCount, icon: Users },
    { label: 'Last synced', value: timeAgo(project.lastSyncedAt), icon: Clock },
  ]

  const fData = freshness.data

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">Project Overview</h2>
          <p className="text-xs text-text-muted mt-0.5">High-level repository activity and knowledge base health.</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            isLoading={busy === 'recheck'}
            onClick={() => void runRecheck()}
          >
            <RotateCw size={14} aria-hidden /> Recheck drift
          </Button>
          <Button
            isLoading={busy === 'sync'}
            onClick={() => void runSync()}
            className="shadow-lg shadow-primary-indigo/20"
          >
            <RefreshCw size={16} aria-hidden /> Sync now
          </Button>
        </div>
      </div>

      {msg && <Alert tone={msg.ok ? 'success' : 'error'}>{msg.text}</Alert>}

      {syncStatus && syncStatus.status !== 'IDLE' && (
        <SyncProgressSection
          status={syncStatus}
          onRetry={() => void runSync()}
          isRetrying={busy === 'sync'}
        />
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map(({ label, value, icon: Icon }, i) => (
          <motion.div key={label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: i * 0.08 }}>
            <Card className="flex items-center gap-4 p-5">
              <span className="rounded-xl bg-primary-light-indigo p-3 text-primary-indigo"><Icon size={20} aria-hidden /></span>
              <div><p className="text-xl font-bold leading-none">{value}</p><p className="mt-1 text-xs text-text-muted">{label}</p></div>
            </Card>
          </motion.div>
        ))}
      </div>

      <Card className="border-indigo-100 bg-gradient-to-br from-surface-card via-surface-card to-indigo-50/30">
        <CardHeader className="flex flex-row items-center justify-between border-b border-surface-border/60 pb-3">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <ShieldCheck size={18} className="text-primary-indigo" />
              <span>Drift-Aware Knowledge Freshness</span>
            </CardTitle>
            <p className="text-xs text-text-muted mt-0.5">
              Dual-dimension monitoring: tracks temporal age and repository commit drift for supporting files.
            </p>
          </div>
          {fData?.lastSnapshotCommit && (
            <span className="font-mono text-xs rounded-md bg-surface-border/60 px-2 py-1 text-text-secondary">
              Baseline: {fData.lastSnapshotCommit.substring(0, 7)}
            </span>
          )}
        </CardHeader>
        <CardContent className="pt-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3.5 text-center">
              <div className="flex items-center justify-center gap-1.5 text-emerald-700 mb-1">
                <ShieldCheck size={16} />
                <span className="text-xs font-bold uppercase tracking-wider">Current</span>
              </div>
              <p className="text-2xl font-black text-emerald-800">{fData?.currentCount ?? 0}</p>
              <p className="text-[11px] text-emerald-600 mt-0.5">Sources up to date</p>
            </div>

            <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3.5 text-center">
              <div className="flex items-center justify-center gap-1.5 text-amber-700 mb-1">
                <AlertTriangle size={16} />
                <span className="text-xs font-bold uppercase tracking-wider">Potentially Stale</span>
              </div>
              <p className="text-2xl font-black text-amber-800">{fData?.potentiallyStaleCount ?? 0}</p>
              <p className="text-[11px] text-amber-700 mt-0.5">Files modified</p>
            </div>

            <div className="rounded-xl border border-red-200 bg-red-50/50 p-3.5 text-center">
              <div className="flex items-center justify-center gap-1.5 text-red-700 mb-1">
                <AlertCircle size={16} />
                <span className="text-xs font-bold uppercase tracking-wider">Outdated</span>
              </div>
              <p className="text-2xl font-black text-red-800">{fData?.outdatedCount ?? 0}</p>
              <p className="text-[11px] text-red-700 mt-0.5">Files deleted / major drift</p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3.5 text-center">
              <div className="flex items-center justify-center gap-1.5 text-slate-700 mb-1">
                <HelpCircle size={16} />
                <span className="text-xs font-bold uppercase tracking-wider">Unknown</span>
              </div>
              <p className="text-2xl font-black text-slate-800">{fData?.unknownCount ?? 0}</p>
              <p className="text-[11px] text-slate-600 mt-0.5">No file baseline</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Connected Repositories</CardTitle></CardHeader>
        <CardContent>
          <ul className="divide-y divide-surface-border">
            {repositories.map((r) => {
              const url = safeUrl(r.url)
              const isSyncing = r.syncStatus === 'Syncing'
              const isFailed = r.syncStatus === 'Failed'
              const isPending = r.syncStatus === 'Pending'
              return (
                <li key={r.id} className="py-3.5 text-sm space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      {url ? (
                        <a href={url} target="_blank" rel="noopener noreferrer" className="font-semibold text-primary-indigo hover:text-primary-violet">
                          {r.owner}/{r.name}
                        </a>
                      ) : (
                        <span className="font-semibold">{r.owner}/{r.name}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-text-muted">{timeAgo(r.lastSyncedAt)}</span>
                      {isFailed && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 px-2 text-xs border-red-200 text-red-700 hover:bg-red-50"
                          isLoading={busy === 'sync'}
                          onClick={() => void runSync()}
                        >
                          <RotateCw size={12} className="mr-1" /> Retry
                        </Button>
                      )}
                      <Badge variant={syncTone(r.syncStatus)} className={cn(isSyncing && 'animate-pulse flex items-center gap-1')}>
                        {isSyncing && <RefreshCw size={12} className="animate-spin" />}
                        {r.syncStatus}
                      </Badge>
                    </div>
                  </div>
                  {isSyncing && (
                    <div className="flex items-center gap-2 rounded-md bg-blue-50/70 px-3 py-1.5 text-xs text-blue-700 border border-blue-100">
                      <RefreshCw size={12} className="animate-spin shrink-0" />
                      <span>{r.lastSyncMessage || 'Extracting architectural knowledge and synthesizing documentation...'}</span>
                    </div>
                  )}
                  {isPending && (
                    <div className="flex items-center gap-2 rounded-md bg-amber-50/70 px-3 py-1.5 text-xs text-amber-700 border border-amber-100">
                      <Clock size={12} className="shrink-0" />
                      <span>Queued for extraction worker...</span>
                    </div>
                  )}
                  {isFailed && r.lastSyncMessage && (
                    <div className="flex items-start gap-2 rounded-md bg-red-50 px-3 py-2 text-xs text-red-700 border border-red-200">
                      <AlertCircle size={14} className="shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold">Sync error: </span>
                        <span>{r.lastSyncMessage}</span>
                      </div>
                    </div>
                  )}
                </li>
              )
            })}
            {repositories.length === 0 && (
              <li className="py-3 text-sm text-text-muted">No repositories connected yet. Add one in Settings.</li>
            )}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <History size={18} className="text-primary-indigo" />
            <span>Synchronization History</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <SyncHistoryTable history={syncHistory} loading={loadingHistory} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Recent Activity</CardTitle></CardHeader>
        <CardContent>
          {recent.loading && !recent.data && <p className="text-sm text-text-muted">Loading activity...</p>}
          {recent.error && <p className="text-sm text-danger">{recent.error}</p>}
          {recent.data && recent.data.items.length === 0 && <p className="py-4 text-center text-sm text-text-muted">No activity yet.</p>}
          {recent.data && recent.data.items.length > 0 && <ActivityList items={recent.data.items} />}
        </CardContent>
      </Card>
    </div>
  )
}
