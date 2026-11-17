import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { orgApi } from '../api/endpoints'
import type { OrgSummary } from '../api/types'
import { errorMessage } from '../lib/format'

const ACTIVE_KEY = 'prism.activeOrg'

interface OrgContextValue {
  orgs: OrgSummary[]
  loading: boolean
  error: string | null
  /** The organization new things default to (like GitHub's account switcher). */
  activeOrg: OrgSummary | null
  setActiveOrgId: (id: number) => void
  refresh: () => Promise<OrgSummary[]>
}

const OrgContext = createContext<OrgContextValue | null>(null)

function readActive(): number | null {
  try {
    const raw = localStorage.getItem(ACTIVE_KEY)
    return raw ? Number(raw) : null
  } catch {
    return null
  }
}

export function OrgProvider({ children }: { children: ReactNode }) {
  const [orgs, setOrgs] = useState<OrgSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeId, setActiveId] = useState<number | null>(readActive)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const list = await orgApi.list()
      setOrgs(list)
      return list
    } catch (err) {
      setError(errorMessage(err))
      throw err
    } finally { setLoading(false) }
  }, [])

  useEffect(() => {
    let cancelled = false
    refresh()
      .catch(() => undefined)
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [refresh])

  const setActiveOrgId = useCallback((id: number) => {
    setActiveId(id)
    try {
      localStorage.setItem(ACTIVE_KEY, String(id))
    } catch {
      /* storage unavailable: choice lasts until reload */
    }
  }, [])

  // Falls back to the first organization (the personal workspace) when the remembered one is gone.
  const activeOrg = useMemo(() => orgs.find((o) => o.id === activeId) ?? orgs[0] ?? null, [orgs, activeId])

  const value = useMemo(
    () => ({ orgs, loading, error, activeOrg, setActiveOrgId, refresh }),
    [orgs, loading, error, activeOrg, setActiveOrgId, refresh],
  )
  return <OrgContext.Provider value={value}>{children}</OrgContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useOrgs(): OrgContextValue {
  const ctx = useContext(OrgContext)
  if (!ctx) throw new Error('useOrgs must be used inside OrgProvider')
  return ctx
}
