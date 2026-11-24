import { ArrowRight, BookOpen, Building2, FileText, FolderGit2, GitBranch, Plus, Sparkles, User as UserIcon, Users } from 'lucide-react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { dashboardApi } from '../../api/endpoints'
import { ActivityList } from '../../components/ActivityList'
import { AttentionPanel } from '../../components/dashboard/AttentionPanel'
import { GettingStarted } from '../../components/dashboard/GettingStarted'
import { HealthChart, TypeChart } from '../../components/dashboard/KnowledgeCharts'
import { RoleBadge } from '../../components/OrgBadges'
import { PageContainer, PageHeader } from '../../components/layout/PageContainer'
import { Button } from '../../components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card'
import { ErrorState, LoadingState } from '../../components/ui/States'
import { useAuth } from '../../context/AuthContext'
import { useOrgs } from '../../context/OrgContext'
import { useAsync } from '../../hooks/useAsync'
import { timeAgo } from '../../lib/format'
import { gettingStartedSteps } from '../../lib/gettingStarted'

export default function DashboardPage() {
  const { user } = useAuth()
  const { activeOrg } = useOrgs()
  const orgId = activeOrg?.id
  const { data, loading, error, reload } = useAsync(() => dashboardApi.get(orgId), [orgId])

  if (loading && !data) return <PageContainer><LoadingState label="Loading workspace dashboard…" /></PageContainer>
  if (error || !data) return <PageContainer><ErrorState message={error ?? 'Could not load the dashboard'} onRetry={reload} /></PageContainer>

  const stats = [
    { label: 'Projects', value: data.projectCount, icon: FolderGit2 },
    { label: 'Repositories', value: data.repositoryCount, icon: GitBranch },
    { label: 'Knowledge items', value: data.knowledgeItemCount, icon: BookOpen },
    { label: 'Collaborators', value: data.contributorCount, icon: Users },
  ]
  const steps = gettingStartedSteps(data)
  const setupDone = steps.every((s) => s.done)
  const latest = data.recentKnowledge[0]

  return (
    <PageContainer>
      <PageHeader
        title={`Welcome back, ${user?.name.split(' ')[0] ?? ''}`}
        subtitle={activeOrg ? `Activity and knowledge in ${activeOrg.name}.` : 'Activity and knowledge across your workspaces.'}
        action={<Link to="/app/projects/new"><Button className="w-full sm:w-auto gap-2 shadow-lg shadow-primary-indigo/20"><Plus size={18} aria-hidden /> New Project</Button></Link>}
      />

      {!setupDone && <GettingStarted steps={steps} />}

      {setupDone && latest && (
        <section aria-label="Latest project knowledge" className="overflow-hidden rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50 via-white to-violet-50 p-5 sm:p-6">
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-sm font-medium text-primary-indigo"><Sparkles size={16} aria-hidden /> Latest project knowledge</p>
              <h2 className="mt-2 break-words text-xl font-semibold sm:text-2xl">{latest.projectName}</h2>
              <p className="mt-1 break-words text-sm text-text-secondary">{latest.title}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link to={`/app/projects/${latest.projectId}/knowledge`} className="inline-flex items-center gap-2 rounded-lg bg-primary-indigo px-3 py-2 text-sm font-semibold text-white hover:bg-primary-blue">
                Open knowledge <ArrowRight size={16} aria-hidden />
              </Link>
              <Link to={`/app/projects/${latest.projectId}/report`} className="inline-flex items-center gap-2 rounded-lg border border-surface-border bg-white px-3 py-2 text-sm font-semibold hover:border-primary-indigo">
                <FileText size={16} aria-hidden /> View report
              </Link>
            </div>
          </div>
        </section>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {stats.map(({ label, value, icon: Icon }, i) => (
          <motion.div key={label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: i * 0.08 }} className="min-w-0">
            <Card className="flex items-center gap-4 p-4 sm:p-5 min-w-0">
              <span className="rounded-xl bg-gradient-to-br from-primary-indigo to-primary-violet p-3 text-white shadow-md shrink-0"><Icon size={20} aria-hidden /></span>
              <div className="min-w-0"><p className="text-xl sm:text-2xl font-bold leading-none">{value}</p><p className="mt-1 text-xs text-text-muted truncate">{label}</p></div>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-3">
        <div className="min-w-0 lg:col-span-2"><AttentionPanel items={data.attention} /></div>
        <div className="min-w-0"><HealthChart health={data.health} /></div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2">
        <div className="min-w-0"><TypeChart rows={data.knowledgeByType} /></div>
        <Card className="min-w-0 h-full overflow-hidden">
          <CardHeader><CardTitle>Recently extracted knowledge</CardTitle></CardHeader>
          <CardContent>
            {data.recentKnowledge.length === 0 ? (
              <p className="py-10 text-center text-sm text-text-muted">Newly extracted knowledge will show up here.</p>
            ) : (
              <ul className="divide-y divide-surface-border">
                {data.recentKnowledge.map((k) => (
                  <li key={k.id}>
                    <Link to={`/app/projects/${k.projectId}/knowledge`} className="flex items-center gap-3 py-2.5 transition-colors hover:text-primary-indigo">
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{k.title}</span>
                        <span className="block truncate text-xs text-text-muted">{k.projectName} · {k.knowledgeType.replace(/_/g, ' ')}</span>
                      </span>
                      <span className="shrink-0 text-xs text-text-muted">{timeAgo(k.updatedAt)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-3">
        <Card className="min-w-0 lg:col-span-2 overflow-hidden">
          <CardHeader><CardTitle>Recent activity</CardTitle></CardHeader>
          <CardContent>
            {data.recentActivity.length === 0
              ? <p className="py-6 text-center text-sm text-text-muted">Activity will appear here once your repositories are synced.</p>
              : <ActivityList items={data.recentActivity} showProject />}
          </CardContent>
        </Card>

        <Card className="min-w-0 overflow-hidden">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>Your organizations</CardTitle>
            <Link to="/app/organizations" className="text-xs font-medium text-primary-indigo hover:text-primary-violet shrink-0">Manage</Link>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {data.organizations.map((o) => {
                const personal = o.type === 'PERSONAL'
                const row = (
                  <div className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-surface-background">
                    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-bold ${personal ? 'bg-primary-light-indigo text-primary-indigo' : 'bg-gradient-to-br from-primary-blue to-primary-violet text-white'}`}>
                      {personal ? <UserIcon size={16} aria-hidden /> : o.name.charAt(0).toUpperCase()}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{o.name}</span>
                      <span className="block text-xs text-text-muted truncate">{o.projectCount} project{o.projectCount === 1 ? '' : 's'} · {o.memberCount} member{o.memberCount === 1 ? '' : 's'}</span>
                    </span>
                    <RoleBadge role={o.role} />
                  </div>
                )
                return <li key={o.id}>{personal ? row : <Link to={`/app/organizations/${o.id}`}>{row}</Link>}</li>
              })}
            </ul>
            {!data.organizations.some((o) => o.type === 'TEAM') && (
              <Link to="/app/organizations?new=1" className="mt-3 flex items-center gap-2 text-sm font-medium text-primary-indigo hover:text-primary-violet"><Building2 size={16} aria-hidden /> Create an organization</Link>
            )}
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  )
}
