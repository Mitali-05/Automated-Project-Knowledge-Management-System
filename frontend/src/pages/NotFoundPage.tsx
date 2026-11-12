import { Link } from 'react-router-dom'
import { PublicPage } from '../components/layout/PublicPage'
import { Button } from '../components/ui/Button'

export default function NotFoundPage() {
  return (
    <PublicPage>
      <div className="mx-auto max-w-md px-4 py-28 text-center">
        <p className="bg-gradient-to-r from-primary-indigo to-primary-violet bg-clip-text text-6xl font-bold text-transparent">404</p>
        <h1 className="mt-3 text-xl font-semibold">Page not found</h1>
        <p className="mb-6 mt-1 text-sm text-text-secondary">The page does not exist, or you do not have access to it.</p>
        <Link to="/"><Button>Go home</Button></Link>
      </div>
    </PublicPage>
  )
}
