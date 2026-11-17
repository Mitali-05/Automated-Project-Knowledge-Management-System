import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { authApi } from '../api/endpoints'
import { tokenStore, UNAUTHORIZED_EVENT } from '../api/client'
import type { SignupInput, User } from '../api/types'
import { ApiError } from '../api/client'
import { errorMessage } from '../lib/format'

interface AuthContextValue {
  user: User | null
  /** True while we are checking a stored token on first load. */
  initializing: boolean
  initializationError: string | null
  retrySession: () => void
  login: (email: string, password: string) => Promise<void>
  signup: (input: SignupInput) => Promise<void>
  logout: () => void
  setUser: (user: User) => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [initializing, setInitializing] = useState<boolean>(() => tokenStore.get() !== null)
  const [initializationError, setInitializationError] = useState<string | null>(null)
  const [sessionAttempt, setSessionAttempt] = useState(0)
  const retrySession = useCallback(() => setSessionAttempt(n => n + 1), [])

  useEffect(() => {
    if (!tokenStore.get()) return
    let cancelled = false
    setInitializing(true)
    setInitializationError(null)
    authApi
      .me()
      .then((u) => !cancelled && setUser(u))
      .catch((err: unknown) => {
        if (cancelled) return
        if (err instanceof ApiError && err.status === 401) tokenStore.clear()
        else setInitializationError(errorMessage(err))
      })
      .finally(() => !cancelled && setInitializing(false))
    return () => {
      cancelled = true
    }
  }, [sessionAttempt])

  useEffect(() => {
    const onUnauthorized = () => setUser(null)
    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized)
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized)
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const res = await authApi.login(email, password)
    tokenStore.set(res.token)
    setInitializationError(null)
    setInitializing(false)
    setUser(res.user)
  }, [])

  const signup = useCallback(async (input: SignupInput) => {
    const res = await authApi.signup(input)
    tokenStore.set(res.token)
    setInitializationError(null)
    setInitializing(false)
    setUser(res.user)
  }, [])

  const logout = useCallback(() => {
    tokenStore.clear()
    setInitializationError(null)
    setInitializing(false)
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({ user, initializing, initializationError, retrySession, login, signup, logout, setUser }),
    [user, initializing, initializationError, retrySession, login, signup, logout],
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
