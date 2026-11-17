import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { errorMessage } from '../lib/format'
import { useAuth } from '../context/AuthContext'
import { SESSION_CLEARED_EVENT } from '../api/client'

export interface AsyncState<T> {
  data: T | null
  loading: boolean
  error: string | null
  reload: () => void
  updateData: (data: T) => void
}
export interface UseAsyncOptions<T> { cacheKey?: string; ttlMs?: number; initialData?: T }
// Private snapshots remain in memory for this signed-in browser session.
const cache = new Map<string, { timestamp: number; data: unknown }>()
if (typeof window !== 'undefined') window.addEventListener(SESSION_CLEARED_EVENT, () => cache.clear())
const CACHE_TTL = 5 * 60_000
function cached<T>(key?: string, ttl = CACHE_TTL): T | null {
  const entry = key ? cache.get(key) : undefined
  if (!entry || Date.now() - entry.timestamp > ttl) return null
  return entry.data as T
}

/** Revalidates with the server and isolates project/user snapshots. */
export function useAsync<T>(fn: () => Promise<T>, deps: unknown[], options?: UseAsyncOptions<T>): AsyncState<T> {
  const { user } = useAuth()
  const key = options?.cacheKey && user ? `${user.id}:${options.cacheKey}` : undefined
  const ttl = options?.ttlMs ?? CACHE_TTL
  // Reload retains this view. Changing dependencies hides the previous response immediately.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const identity = useMemo(() => ({}), [...deps, key])
  const [state, setState] = useState(() => ({ identity, data: options?.initialData ?? cached<T>(key, ttl), loading: true, error: null as string | null }))
  const [tick, setTick] = useState(0)
  const fnRef = useRef(fn)
  fnRef.current = fn
  useEffect(() => {
    let cancelled = false
    setState(prev => ({ identity, data: prev.identity === identity ? prev.data : cached<T>(key, ttl), loading: true, error: null }))
    Promise.resolve().then(() => fnRef.current()).then(data => {
      if (cancelled) return
      if (key) {
        if (cache.size >= 100) cache.delete(cache.keys().next().value as string)
        cache.set(key, { timestamp: Date.now(), data })
      }
      setState({ identity, data, loading: false, error: null })
    }).catch((err: unknown) => {
      if (!cancelled) setState(prev => ({ ...prev, loading: false, error: errorMessage(err) }))
    })
    return () => { cancelled = true }
  }, [identity, tick, key, ttl])
  const reload = useCallback(() => setTick(t => t + 1), [])
  const updateData = useCallback((data: T) => {
    if (key) cache.set(key, { timestamp: Date.now(), data })
    setState({ identity, data, loading: false, error: null })
  }, [identity, key])
  return { ...(state.identity === identity ? state : { data: cached<T>(key, ttl), loading: true, error: null }), reload, updateData }
}
