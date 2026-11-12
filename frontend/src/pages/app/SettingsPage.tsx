import { useState, type FormEvent } from 'react'
import { ApiError } from '../../api/client'
import { userApi } from '../../api/endpoints'
import { PageContainer, PageHeader } from '../../components/layout/PageContainer'
import { Button } from '../../components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { Alert } from '../../components/ui/States'
import { useAuth } from '../../context/AuthContext'
import { errorMessage } from '../../lib/format'

interface Msg { ok: boolean; text: string }

export default function SettingsPage() {
  const { user, setUser } = useAuth()
  const [name, setName] = useState(user?.name ?? '')
  const [profileMsg, setProfileMsg] = useState<Msg | null>(null)
  const [savingProfile, setSavingProfile] = useState(false)
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [pwMsg, setPwMsg] = useState<Msg | null>(null)
  const [pwErrors, setPwErrors] = useState<Record<string, string>>({})
  const [savingPw, setSavingPw] = useState(false)

  const saveProfile = async (e: FormEvent) => {
    e.preventDefault()
    setProfileMsg(null)
    setSavingProfile(true)
    try {
      setUser(await userApi.updateProfile(name.trim()))
      setProfileMsg({ ok: true, text: 'Profile updated' })
    } catch (err) {
      setProfileMsg({ ok: false, text: errorMessage(err) })
    } finally {
      setSavingProfile(false)
    }
  }

  const savePassword = async (e: FormEvent) => {
    e.preventDefault()
    setPwMsg(null)
    setPwErrors({})
    setSavingPw(true)
    try {
      await userApi.changePassword(current, next)
      setCurrent('')
      setNext('')
      setPwMsg({ ok: true, text: 'Password changed' })
    } catch (err) {
      if (err instanceof ApiError) setPwErrors(err.fieldErrors)
      setPwMsg({ ok: false, text: errorMessage(err) })
    } finally {
      setSavingPw(false)
    }
  }

  return (
    <PageContainer narrow>
      <PageHeader title="Settings" subtitle="Manage your account." />
      <Card>
        <CardHeader><CardTitle>Profile</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={saveProfile} className="space-y-4">
            {profileMsg && <Alert tone={profileMsg.ok ? 'success' : 'error'}>{profileMsg.text}</Alert>}
            <Input label="Name" required value={name} onChange={(e) => setName(e.target.value)} />
            <Input label="Email" value={user?.email ?? ''} disabled readOnly />
            <Button type="submit" isLoading={savingProfile} disabled={!name.trim() || name.trim() === user?.name}>Save changes</Button>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Change password</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={savePassword} className="space-y-4">
            {pwMsg && <Alert tone={pwMsg.ok ? 'success' : 'error'}>{pwMsg.text}</Alert>}
            <Input label="Current password" type="password" autoComplete="current-password" required value={current} onChange={(e) => setCurrent(e.target.value)} error={pwErrors.currentPassword} />
            <Input label="New password" type="password" autoComplete="new-password" required value={next} onChange={(e) => setNext(e.target.value)} error={pwErrors.newPassword} hint="8+ characters with a letter and a number." />
            <Button type="submit" isLoading={savingPw} disabled={!current || !next}>Change password</Button>
          </form>
        </CardContent>
      </Card>
    </PageContainer>
  )
}
