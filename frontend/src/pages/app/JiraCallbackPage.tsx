import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { jiraApi } from '../../api/jira'
import { PageContainer } from '../../components/layout/PageContainer'
import { Alert, LoadingState } from '../../components/ui/States'
import { errorMessage } from '../../lib/format'

export default function JiraCallbackPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const started = useRef(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (started.current) return
    started.current = true
    const code = params.get('code')
    const state = params.get('state')
    const denied = params.has('error')
    // Remove the one-time code from the address bar and referrers immediately.
    window.history.replaceState(window.history.state, '', '/app/jira/callback')
    if (denied || !code || !state) {
      setError(denied ? 'Jira authorization was not granted. Return to your project to connect again.'
        : 'The Jira callback is incomplete. Start again from your project’s Jira tab.')
      return
    }
    jiraApi.complete(code, state)
      .then(({ projectId }) => navigate(`/app/projects/${projectId}/jira`, { replace: true }))
      .catch((err: unknown) => setError(errorMessage(err)))
  }, [params, navigate])

  return <PageContainer narrow>
    {error ? <div className="space-y-4"><Alert>{error}</Alert>
      <Link to="/app/projects" className="text-primary-indigo hover:underline">Back to projects</Link>
    </div> : <><h1 className="text-2xl font-bold">Connecting Jira</h1><LoadingState rows={1} /></>}
  </PageContainer>
}
