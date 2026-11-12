import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { authApi } from '../api/endpoints'
import { tokenStore, UNAUTHORIZED_EVENT } from '../api/client'
import type { SignupInput, User } from '../api/types'

interface AuthContextValue {
  user: User | null
  /** True while we are checking a stored token on first load. */
  initializing: boolean
  login: (email: string, password: string) => Promise<void>
  signup: (input: SignupInput) => Promise<void>
  logout: () => void
  setUser: (user: User) => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [initializing, setInitializing] = useState<boolean>(() => tokenStore.get() !== null)

  useEffect(() => {
    if (!tokenStore.get()) return
    let cancelled = false
    authApi
      .me()
      .then((u) => !cancelled && setUser(u))
      .catch(() => tokenStore.clear())
      .finally(() => !cancelled && setInitializing(false))
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const onUnauthorized = () => setUser(null)
    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized)
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized)
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const res = await authApi.login(email, password)
    tokenStore.set(res.token)
    setUser(res.user)
  }, [])

  const signup = useCallback(async (input: SignupInput) => {
    const res = await authApi.signup(input)
    tokenStore.set(res.token)
    setUser(res.user)
  }, [])

  const logout = useCallback(() => {
    tokenStore.clear()
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({ user, initializing, login, signup, logout, setUser }),
    [user, initializing, login, signup, logout],
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
