import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, Building2, KeyRound, User as UserIcon } from 'lucide-react'
import { orgApi } from '../api/endpoints'
import { ApiError } from '../api/client'
import { Logo } from '../components/layout/Logo'
import { Alert } from '../components/ui/States'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Input } from '../components/ui/Input'
import { useAuth } from '../context/AuthContext'
import { useOrgs } from '../context/OrgContext'
import { errorMessage } from '../lib/format'

type Mode = 'choose' | 'create' | 'join'

export default function WelcomePage() {
  const { user } = useAuth()
  const { refresh, setActiveOrgId } = useOrgs()
  const navigate = useNavigate()
  const [mode, setMode] = useState<Mode>('choose')
  const [value, setValue] = useState('')
  const [error, setError] = useState('')
  const [fieldError, setFieldError] = useState('')
  const [busy, setBusy] = useState(false)

  const finish = (orgId?: number) => {
    if (orgId) setActiveOrgId(orgId)
    navigate('/app', { replace: true })
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setFieldError('')
    setBusy(true)
    try {
      const org = mode === 'create' ? await orgApi.create(value.trim()) : await orgApi.join(value.trim())
      await refresh()
      finish(org.id)
    } catch (err) {
      if (err instanceof ApiError && Object.keys(err.fieldErrors).length > 0) setFieldError(Object.values(err.fieldErrors)[0])
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const options = [
    { key: 'create' as const, icon: Building2, title: 'Create an organization', text: 'Set up a shared space for your team and invite people with a code.' },
    { key: 'join' as const, icon: KeyRound, title: 'Join an organization', text: 'Got an invite code from a teammate? Enter it to join their organization.' },
  ]

  return (
    <div className="relative flex min-h-screen flex-col items-center overflow-hidden bg-surface-background px-4 py-8 sm:py-10">
      <div className="pointer-events-none absolute left-[-10%] top-[-20%] h-1/2 w-1/2 rounded-full bg-primary-indigo/20 blur-[120px]" />
      <div className="pointer-events-none absolute bottom-[-20%] right-[-10%] h-1/2 w-1/2 rounded-full bg-primary-blue/20 blur-[120px]" />
      <div className="relative z-10 w-full max-w-3xl">
        <Logo to="/app" />
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }} className="mt-8 sm:mt-10">
          <h1 className="text-2xl sm:text-3xl font-bold text-text-primary">Welcome{user ? `, ${user.name.split(' ')[0]}` : ''} 👋</h1>
          <p className="mt-2 max-w-xl text-xs sm:text-sm text-text-secondary">Where will your projects live? You already have a personal workspace, and you can create or join organizations at any time, just like on GitHub.</p>

          {mode === 'choose' ? (
            <div className="mt-6 sm:mt-8 grid gap-4 md:grid-cols-2">
              {options.map((o) => (
                <button key={o.key} onClick={() => setMode(o.key)} className="text-left cursor-pointer">
                  <Card className="h-full p-5 sm:p-6 transition-all duration-300 hover:-translate-y-1 hover:border-primary-indigo/40 hover:shadow-xl">
                    <span className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-primary-light-indigo text-primary-indigo"><o.icon size={22} aria-hidden /></span>
                    <h2 className="text-base sm:text-lg font-bold text-text-primary">{o.title}</h2>
                    <p className="mt-1 text-xs sm:text-sm text-text-secondary leading-relaxed">{o.text}</p>
                  </Card>
                </button>
              ))}
              <button onClick={() => finish()} className="text-left md:col-span-2 cursor-pointer">
                <Card className="flex items-center gap-4 p-4 sm:p-5 transition-all duration-300 hover:border-primary-indigo/40 hover:shadow-lg">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-surface-background text-text-secondary"><UserIcon size={22} aria-hidden /></span>
                  <span className="flex-1 min-w-0">
                    <span className="block font-bold text-text-primary text-sm sm:text-base">Skip for now</span>
                    <span className="block text-xs sm:text-sm text-text-secondary">Start in your personal workspace. You can add an organization later from the sidebar.</span>
                  </span>
                  <ArrowRight size={18} className="text-text-muted shrink-0" aria-hidden />
                </Card>
              </button>
            </div>
          ) : (
            <Card className="mt-6 sm:mt-8 max-w-md p-4 sm:p-6">
              <form onSubmit={submit} className="space-y-4" noValidate>
                {error && !fieldError && <Alert>{error}</Alert>}
                <Input
                  label={mode === 'create' ? 'Organization name' : 'Invite code'}
                  placeholder={mode === 'create' ? 'e.g. Acme Engineering' : 'e.g. K7P2M9QXTA'}
                  value={value} onChange={(e) => setValue(e.target.value)} error={fieldError || undefined}
                  maxLength={mode === 'create' ? 150 : 32} autoFocus required
                />
                <div className="flex gap-3">
                  <Button variant="ghost" onClick={() => { setMode('choose'); setValue(''); setError(''); setFieldError('') }}>Back</Button>
                  <Button type="submit" isLoading={busy} disabled={!value.trim()} className="flex-1">{mode === 'create' ? 'Create organization' : 'Join organization'}</Button>
                </div>
              </form>
            </Card>
          )}
        </motion.div>
      </div>
    </div>
  )
}
