import { useEffect, useState } from 'react'
import { LoaderCircle } from 'lucide-react'
import { API_ACTIVITY_EVENT, pendingApiRequests } from '../../api/client'

/** Request activity, not fabricated percentage progress. Existing content stays usable. */
export function ApiActivityIndicator() {
  const [count, setCount] = useState(pendingApiRequests)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const update = () => setCount(pendingApiRequests())
    window.addEventListener(API_ACTIVITY_EVENT, update)
    update()
    return () => window.removeEventListener(API_ACTIVITY_EVENT, update)
  }, [])
  const active = count > 0
  useEffect(() => {
    if (!active) {
      setVisible(false)
      return
    }
    const timer = window.setTimeout(() => setVisible(true), 550)
    return () => window.clearTimeout(timer)
  }, [active])
  if (!active || !visible) return null
  return (
    <div role="status" className="pointer-events-none fixed bottom-4 right-4 z-[60] max-w-[calc(100%-2rem)] rounded-xl border border-surface-border bg-surface-card px-4 py-3 shadow-lg sm:bottom-6 sm:right-6">
      <div className="flex items-center gap-3">
        <span className="rounded-lg bg-primary-light-indigo p-2 text-primary-indigo">
          <LoaderCircle size={18} className="animate-spin motion-reduce:animate-none" aria-hidden />
        </span>
        <span className="text-sm font-semibold text-text-primary">Working…</span>
      </div>
    </div>
  )
}
