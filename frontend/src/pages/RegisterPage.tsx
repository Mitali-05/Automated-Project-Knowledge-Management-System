import { useState, type ChangeEvent, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { ApiError } from '../api/client'
import { AuthLayout } from '../components/layout/AuthLayout'
import { Alert } from '../components/ui/States'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { useAuth } from '../context/AuthContext'
import { errorMessage } from '../lib/format'

const initial = { name: '', email: '', password: '', confirm: '' }

export default function RegisterPage() {
  const { user, signup } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState(initial)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)

  if (user) return <Navigate to="/app" replace />

  const set = (key: keyof typeof initial) => (e: ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setFieldErrors({})
    if (!form.name.trim()) return setError('Name is required.')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return setError('Please enter a valid email address.')
    if (!/^(?=.*[A-Za-z])(?=.*\d).{8,72}$/.test(form.password)) return setError('Password must be 8-72 characters with at least one letter and one number.')
    if (form.password !== form.confirm) return setError('Passwords do not match.')
    setBusy(true)
    try {
      await signup({ name: form.name, email: form.email, password: form.password })
      navigate('/welcome', { replace: true })
    } catch (err) {
      if (err instanceof ApiError) setFieldErrors(err.fieldErrors)
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const bg = 'border-white/60 bg-white/50 focus:bg-white'
  return (
    <AuthLayout
      mirrored image="/prism-logo.png" imageAlt="PRISM logo"
      heading="Your data stays private" text="Projects are visible only to the people you add. PRISM stores extracted knowledge and evidence links, not your source code."
    >
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary">Create your account</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Already have an account? <Link to="/login" className="font-medium text-primary-indigo transition-colors hover:text-primary-violet">Login</Link>
        </p>
      </div>
      <form className="space-y-4" onSubmit={onSubmit} noValidate>
        {error && <Alert>{error}</Alert>}
        <Input label="Full Name" autoComplete="name" placeholder="Enter your full name" required value={form.name} onChange={set('name')} error={fieldErrors.name} className={bg} />
        <Input label="Email Address" type="email" autoComplete="email" placeholder="Enter your email address" required value={form.email} onChange={set('email')} error={fieldErrors.email} className={bg} />
        <Input label="Password" type="password" autoComplete="new-password" placeholder="Create a password" required value={form.password} onChange={set('password')} error={fieldErrors.password} hint="8+ characters with a letter and a number." className={bg} />
        <Input label="Confirm Password" type="password" autoComplete="new-password" placeholder="Confirm your password" required value={form.confirm} onChange={set('confirm')} className={bg} />
        <Button type="submit" isLoading={busy} className="mt-2 h-12 w-full text-base shadow-lg shadow-primary-indigo/30">{busy ? 'Creating Account...' : 'Create Account'}</Button>
      </form>
    </AuthLayout>
  )
}
