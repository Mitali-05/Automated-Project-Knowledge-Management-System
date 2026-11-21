import { BookOpen, Building2, FolderGit2, GitBranch, Plus, User as UserIcon, Users } from 'lucide-react'
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

  if (loading && !data) return <PageContainer><LoadingState /></PageContainer>
  if (error || !data) return <PageContainer><ErrorState message={error ?? 'Could not load the dashboard'} onRetry={reload} /></PageContainer>

  const stats = [
    { label: 'Projects', value: data.projectCount, icon: FolderGit2 },
    { label: 'Repositories', value: data.repositoryCount, icon: GitBranch },
    { label: 'Knowledge items', value: data.knowledgeItemCount, icon: BookOpen },
    { label: 'Collaborators', value: data.contributorCount, icon: Users },
  ]
  const steps = gettingStartedSteps(data)
  const setupDone = steps.every((s) => s.done)

  return (
    <PageContainer>
      <PageHeader
        title={`Welcome back, ${user?.name.split(' ')[0] ?? ''}`}
        subtitle="What is happening across all your organizations."
        action={<Link to="/app/projects/new"><Button className="w-full sm:w-auto gap-2 shadow-lg shadow-primary-indigo/20"><Plus size={18} aria-hidden /> New Project</Button></Link>}
      />

      {!setupDone && <GettingStarted steps={steps} />}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {stats.map(({ label, value, icon: Icon }, i) => (
          <motion.div key={label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: i * 0.08 }}>
            <Card className="flex items-center gap-4 p-4 sm:p-5">
              <span className="rounded-xl bg-gradient-to-br from-primary-indigo to-primary-violet p-3 text-white shadow-md"><Icon size={20} aria-hidden /></span>
              <div><p className="text-xl sm:text-2xl font-bold leading-none">{value}</p><p className="mt-1 text-xs text-text-muted">{label}</p></div>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid gap-4 sm:gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2"><AttentionPanel items={data.attention} /></div>
        <HealthChart health={data.health} />
      </div>

      <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
        <TypeChart rows={data.knowledgeByType} />
        <Card className="h-full">
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

      <div className="grid gap-4 sm:gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Recent activity</CardTitle></CardHeader>
          <CardContent>
            {data.recentActivity.length === 0
              ? <p className="py-6 text-center text-sm text-text-muted">Activity will appear here once your repositories are synced.</p>
              : <ActivityList items={data.recentActivity} showProject />}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>Your organizations</CardTitle>
            <Link to="/app/organizations" className="text-xs font-medium text-primary-indigo hover:text-primary-violet">Manage</Link>
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
                      <span className="block text-xs text-text-muted">{o.projectCount} project{o.projectCount === 1 ? '' : 's'} · {o.memberCount} member{o.memberCount === 1 ? '' : 's'}</span>
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
