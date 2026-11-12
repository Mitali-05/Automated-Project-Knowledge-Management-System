import { BookOpen, GitBranch, RefreshCw, Users, Clock } from 'lucide-react'
import { motion } from 'framer-motion'
import { useState } from 'react'
import { activityApi, projectApi } from '../../api/endpoints'
import { ActivityList } from '../../components/ActivityList'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card'
import { Alert } from '../../components/ui/States'
import { useAsync } from '../../hooks/useAsync'
import { useProject } from '../../hooks/useProject'
import { errorMessage, safeUrl, timeAgo } from '../../lib/format'
import { syncTone } from '../../lib/tones'

export default function OverviewTab() {
  const { detail, reload } = useProject()
  const { project, repositories } = detail
  const recent = useAsync(() => activityApi.list(project.id, 0, 5), [project.id])
  const [busy, setBusy] = useState<'sync' | null>(null)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const run = async () => {
    setBusy('sync')
    setMsg(null)
    try {
      const r = await projectApi.sync(project.id)
      setMsg({ ok: true, text: `Sync requested for ${r.queued} ${r.queued === 1 ? 'repository' : 'repositories'}.` })
      recent.reload()
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

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-bold">Overview</h2>
        <div className="flex gap-2">
          <Button isLoading={busy === 'sync'} onClick={() => void run()} className="shadow-lg shadow-primary-indigo/20"><RefreshCw size={16} aria-hidden /> Sync now</Button>
        </div>
      </div>
      {msg && <Alert tone={msg.ok ? 'success' : 'error'}>{msg.text}</Alert>}

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

      <Card>
        <CardHeader><CardTitle>Repositories</CardTitle></CardHeader>
        <CardContent>
          <ul className="divide-y divide-surface-border">
            {repositories.map((r) => {
              const url = safeUrl(r.url)
              return (
                <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                  <div className="min-w-0">
                    {url ? <a href={url} target="_blank" rel="noopener noreferrer" className="font-medium text-primary-indigo hover:text-primary-violet">{r.owner}/{r.name}</a> : <span className="font-medium">{r.owner}/{r.name}</span>}
                    {r.lastSyncMessage && <p className="text-xs text-text-muted">{r.lastSyncMessage}</p>}
                  </div>
                  <div className="flex items-center gap-3"><span className="text-xs text-text-muted">{timeAgo(r.lastSyncedAt)}</span><Badge variant={syncTone(r.syncStatus)}>{r.syncStatus}</Badge></div>
                </li>
              )
            })}
            {repositories.length === 0 && <li className="py-3 text-sm text-text-muted">No repositories connected yet. Add one in Settings.</li>}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Recent activity</CardTitle></CardHeader>
        <CardContent>
          {recent.loading && !recent.data && <p className="text-sm text-text-muted">Loading...</p>}
          {recent.error && <p className="text-sm text-danger">{recent.error}</p>}
          {recent.data && recent.data.items.length === 0 && <p className="py-4 text-center text-sm text-text-muted">No activity yet.</p>}
          {recent.data && recent.data.items.length > 0 && <ActivityList items={recent.data.items} />}
        </CardContent>
      </Card>
    </div>
  )
}
