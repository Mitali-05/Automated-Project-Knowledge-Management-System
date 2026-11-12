import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { githubApi } from '../../api/endpoints'
import { PageContainer } from '../../components/layout/PageContainer'
import { Alert, LoadingState } from '../../components/ui/States'
import { errorMessage } from '../../lib/format'

/** Landing page after GitHub redirects back from the app installation. */
export default function GithubCallbackPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const started = useRef(false)

  useEffect(() => {
    if (started.current) return
    started.current = true
    const installationId = params.get('installation_id')
    const state = params.get('state')
    if (!installationId || !state) {
      setError('GitHub did not return the expected details. Please start the connection again.')
      return
    }
    githubApi.complete(installationId, state, params.get('code') ?? undefined)
      .then(({ orgId }) => navigate(`/app/organizations/${orgId}`, { replace: true }))
      .catch((err: unknown) => setError(errorMessage(err)))
  }, [params, navigate])

  return (
    <PageContainer narrow>
      {error ? (
        <div className="space-y-3">
          <Alert>{error}</Alert>
          <Link to="/app/organizations" className="text-sm font-medium text-primary-indigo hover:underline">Back to organizations</Link>
        </div>
      ) : <LoadingState rows={1} />}
    </PageContainer>
  )
}
