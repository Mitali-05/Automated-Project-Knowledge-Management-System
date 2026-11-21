import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { githubApi } from '../../api/endpoints'
import { PageContainer } from '../../components/layout/PageContainer'
import { Alert, LoadingState } from '../../components/ui/States'
import { Button } from '../../components/ui/Button'
import { useOrgs } from '../../context/OrgContext'
import { errorMessage } from '../../lib/format'

export default function GithubCallbackPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { refresh } = useOrgs()
  const [error, setError] = useState<string | null>(null)
  const started = useRef(false)
  const [options, setOptions] = useState<Awaited<ReturnType<typeof githubApi.authorizeConnection>> | null>(null)
  const [selected, setSelected] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (started.current) return
    started.current = true
    const installationId = params.get('installation_id')
    const state = params.get('state')
    const code = params.get('code')
    window.history.replaceState(window.history.state, '', '/app/github/callback')
    if (params.has('error')) {
      setError('GitHub authorization was not granted. Start again from your workspace.')
      return
    }
    if (code && state && !installationId) {
      githubApi.authorizeConnection(code, state).then(setOptions)
        .catch((err: unknown) => setError(errorMessage(err)))
      return
    }
    if (!installationId || !state) {
      setError('GitHub did not return the expected details. Please start the connection again.')
      return
    }
    githubApi.complete(installationId, state, params.get('code') ?? undefined)
      .then(async ({ orgId }) => { await refresh(); navigate(`/app/organizations/${orgId}`, { replace: true }) })
      .catch((err: unknown) => setError(errorMessage(err)))
  }, [params, navigate, refresh])

  return (
    <PageContainer narrow>
      {error ? (
        <div className="space-y-3">
          <Alert>{error}</Alert>
          <Link to="/app/organizations" className="text-sm font-medium text-primary-indigo hover:underline">Back to organizations</Link>
        </div>
      ) : options ? <div className="space-y-4">
        <h1 className="text-xl sm:text-2xl font-bold">Choose your GitHub installation</h1>
        <p className="text-xs sm:text-sm text-text-secondary">Connect an installation you manage to this PRISM workspace. Its selected repositories will be available for workspace projects.</p>
        {options.installations.length > 0 ? <>
          <label className="block text-sm font-medium">GitHub account or organization
            <select value={selected} onChange={(e) => setSelected(e.target.value)} disabled={busy}
              className="mt-2 block w-full rounded-xl border border-surface-border bg-white p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-indigo">
              <option value="">Select an installation</option>
              {options.installations.map(i => <option key={i.id} value={i.id}>{i.account}</option>)}
            </select>
          </label>
          <Button disabled={!selected} isLoading={busy} onClick={() => {
            setBusy(true)
            githubApi.selectConnection(options.connectionId, selected)
              .then(async ({orgId}) => { await refresh(); navigate(`/app/organizations/${orgId}`, {replace:true}) })
              .catch((err:unknown) => {setError(errorMessage(err));setBusy(false)})
          }}>Connect selected installation</Button>
        </> : <>
          <Alert tone="info">No active PRISM installation that you manage was found. Install the app, then return to your workspace and authorize GitHub again.</Alert>
          <a className="text-primary-indigo underline text-sm" href={options.installUrl}>Install PRISM GitHub App</a>
        </>}
        <Link to="/app/organizations" className="block text-primary-indigo underline text-sm">Back to workspaces</Link>
      </div> : <LoadingState rows={1} />}
    </PageContainer>
  )
}
