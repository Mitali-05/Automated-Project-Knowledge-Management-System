import { Navigate } from 'react-router-dom'

/** Preserve the former organization page entry point after multi-organization support. */
export default function OrganizationPage() {
  return <Navigate to="/app/organizations" replace />
}
