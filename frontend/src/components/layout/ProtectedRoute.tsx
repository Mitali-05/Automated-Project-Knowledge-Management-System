import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { OrgProvider } from '../../context/OrgContext'
import { LoadingState } from '../ui/States'

export function ProtectedRoute() {
  const { user, initializing } = useAuth()
  const location = useLocation()
  if (initializing) return <div className="mx-auto max-w-3xl p-8"><LoadingState /></div>
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  return <OrgProvider><Outlet /></OrgProvider>
}
