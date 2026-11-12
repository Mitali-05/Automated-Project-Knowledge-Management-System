import { useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { AuthLayout } from '../components/layout/AuthLayout'
import { Alert } from '../components/ui/States'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { useAuth } from '../context/AuthContext'
import { errorMessage } from '../lib/format'

export default function LoginPage() {
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from ?? '/app'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (user) return <Navigate to={from} replace />

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    if (!email.trim() || !password) return setError('Email and password are required.')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setError('Please enter a valid email address.')
    setBusy(true)
    try {
      await login(email, password)
      navigate(from, { replace: true })
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthLayout
      image="/lock-illustration.jpg" imageAlt="PRISM security lock" imageClass="w-80 mix-blend-darken"
      heading="Welcome to PRISM" text="Your project knowledge, extracted from the work your team already does."
    >
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-text-primary">Welcome back</h1>
        <p className="mt-2 text-sm text-text-secondary">Sign in to your team workspace</p>
      </div>
      <form className="space-y-6" onSubmit={onSubmit} noValidate>
        {error && <Alert>{error}</Alert>}
        <Input label="Email Address" type="email" autoComplete="email" placeholder="Enter your email address" required value={email} onChange={(e) => setEmail(e.target.value)} className="border-white/60 bg-white/50 focus:bg-white" />
        <Input label="Password" type="password" autoComplete="current-password" placeholder="Enter your password" required value={password} onChange={(e) => setPassword(e.target.value)} className="border-white/60 bg-white/50 focus:bg-white" />
        <Button type="submit" isLoading={busy} className="mt-2 h-12 w-full text-base shadow-lg shadow-primary-indigo/30">{busy ? 'Signing in...' : 'Sign In'}</Button>
      </form>
      <div className="mt-8 text-center text-sm text-text-secondary">
        Don't have an account?{' '}
        <Link to="/register" className="inline-flex items-center gap-1 font-medium text-primary-indigo transition-colors hover:text-primary-violet">Create Account <ChevronRight size={14} aria-hidden /></Link>
      </div>
    </AuthLayout>
  )
}
