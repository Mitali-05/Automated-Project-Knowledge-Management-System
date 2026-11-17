import { useEffect, useState } from 'react'
import { LoaderCircle } from 'lucide-react'
import { API_ACTIVITY_EVENT, pendingApiRequests } from '../../api/client'

/** Request activity, not fabricated percentage progress. Existing content stays usable. */
export function ApiActivityIndicator() {
  const [count, setCount] = useState(pendingApiRequests)
  useEffect(() => {
    const update = () => setCount(pendingApiRequests())
    window.addEventListener(API_ACTIVITY_EVENT, update)
    update()
    return () => window.removeEventListener(API_ACTIVITY_EVENT, update)
  }, [])
  if (!count) return null
  return <div role="status" aria-live="polite" className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-full border border-surface-border bg-surface-card px-4 py-2 text-sm text-text-secondary shadow-md">
    <LoaderCircle size={18} className="animate-spin motion-reduce:animate-none text-primary-indigo" aria-hidden />Loading data...
  </div>
}
