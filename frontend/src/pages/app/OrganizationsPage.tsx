import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, Building2, FolderGit2, GitBranch, KeyRound, Plus, User as UserIcon, Users } from 'lucide-react'
import { ApiError } from '../../api/client'
import { orgApi } from '../../api/endpoints'
import { RoleBadge } from '../../components/OrgBadges'
import { PageContainer, PageHeader } from '../../components/layout/PageContainer'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card, CardContent } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { Alert, LoadingState } from '../../components/ui/States'
import { useOrgs } from '../../context/OrgContext'
import { errorMessage } from '../../lib/format'

type Panel = 'none' | 'create' | 'join'

export default function OrganizationsPage() {
  const { orgs, loading, refresh, setActiveOrgId } = useOrgs()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const [panel, setPanel] = useState<Panel>(params.get('new') ? 'create' : 'none')
  const [value, setValue] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const open = (p: Panel) => { setPanel(panel === p ? 'none' : p); setValue(''); setError('') }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const org = panel === 'create' ? await orgApi.create(value.trim()) : await orgApi.join(value.trim())
      await refresh()
      setActiveOrgId(org.id)
      navigate(`/app/organizations/${org.id}`)
    } catch (err) {
      setError(err instanceof ApiError && Object.values(err.fieldErrors)[0] ? Object.values(err.fieldErrors)[0] : errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <PageContainer>
      <PageHeader title="Organizations" subtitle="The teams you work with. Every project belongs to exactly one of them."
        action={
          <div className="flex flex-wrap gap-2 w-full sm:w-auto">
            <Button variant="outline" onClick={() => open('join')} className="flex-1 sm:flex-initial"><KeyRound size={16} aria-hidden /> Join with code</Button>
            <Button onClick={() => open('create')} className="flex-1 sm:flex-initial shadow-lg shadow-primary-indigo/20"><Plus size={16} aria-hidden /> New organization</Button>
          </div>
        } />

      {panel !== 'none' && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
          <Card><CardContent className="p-4 sm:p-6">
            <form onSubmit={submit} className="flex max-w-xl flex-col gap-3 sm:flex-row sm:items-end" noValidate>
              <div className="flex-1 space-y-3">
                {error && <Alert>{error}</Alert>}
                <Input
                  label={panel === 'create' ? 'Organization name' : 'Invite code'}
                  placeholder={panel === 'create' ? 'e.g. Acme Engineering' : 'Paste the code you were given'}
                  value={value} onChange={(e) => setValue(e.target.value)} maxLength={panel === 'create' ? 150 : 32} autoFocus
                />
              </div>
              <Button type="submit" isLoading={busy} disabled={!value.trim()} className="w-full sm:w-auto h-11 sm:h-10">{panel === 'create' ? 'Create' : 'Join'}</Button>
            </form>
          </CardContent></Card>
        </motion.div>
      )}

      {loading && orgs.length === 0 ? <LoadingState /> : (
        <div className="grid grid-cols-1 gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {orgs.map((o, i) => {
            const personal = o.type === 'PERSONAL'
            const card = (
              <Card className="group h-full p-4 sm:p-6 transition-all duration-300 hover:border-primary-indigo/40 hover:shadow-xl">
                <div className="mb-4 flex items-start justify-between">
                  <span className={`flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-xl text-lg font-bold shadow-md ${personal ? 'bg-primary-light-indigo text-primary-indigo' : 'bg-gradient-to-br from-primary-blue to-primary-violet text-white'}`}>
                    {personal ? <UserIcon size={22} aria-hidden /> : o.name.charAt(0).toUpperCase()}
                  </span>
                  <RoleBadge role={o.role} />
                </div>
                <h3 className="line-clamp-1 text-lg sm:text-xl font-bold text-text-primary transition-colors group-hover:text-primary-indigo">{o.name}</h3>
                <p className="mb-4 sm:mb-5 mt-1 text-xs sm:text-sm text-text-secondary">{personal ? 'Your private workspace. Only you are in it.' : 'Shared with your team.'}</p>
                <div className="flex flex-wrap items-center gap-3 sm:gap-4 border-t border-surface-border pt-4 text-xs text-text-muted">
                  <span className="flex items-center gap-1.5" title="Members"><Users size={14} className="text-primary-indigo" aria-hidden />{o.memberCount}</span>
                  <span className="flex items-center gap-1.5" title="Your projects here"><FolderGit2 size={14} className="text-primary-indigo" aria-hidden />{o.projectCount}</span>
                  <span className="ml-auto flex items-center gap-1.5"><GitBranch size={14} className="text-primary-indigo" aria-hidden />
                    <Badge variant={o.githubConnected ? 'success' : 'outline'}>{o.githubConnected ? 'GitHub connected' : 'No GitHub'}</Badge>
                  </span>
                </div>
                <p className="mt-4 flex items-center justify-between text-xs sm:text-sm font-medium text-primary-indigo">
                  {personal ? 'Workspace settings' : 'Organization settings'}<ArrowRight size={16} aria-hidden />
                </p>
              </Card>
            )
            return (
              <motion.div key={o.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: i * 0.06 }}>
                <Link to={`/app/organizations/${o.id}`} aria-label={`Open settings for ${o.name}`}
                  className="block h-full rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-indigo focus-visible:ring-offset-2">{card}</Link>
              </motion.div>
            )
          })}
        </div>
      )}
      {orgs.length === 1 && orgs[0].type === 'PERSONAL' && (
        <p className="flex items-center gap-2 text-xs sm:text-sm text-text-muted"><Building2 size={16} aria-hidden /> You only have your personal workspace so far. Create an organization to collaborate with a team.</p>
      )}
    </PageContainer>
  )
}
